import { promises as fs } from 'fs';
import path from 'path';
import pool from '../database/db.js';

const UPLOAD_DIRS = ['uploads/documents', 'uploads/profiles'];

function retentionDays(): number {
  const raw = Number(process.env.UPLOAD_RETENTION_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
}

type MediaColumn = { table_name: string; column_name: string };

export type StorageCleanupResult = {
  scanned: number;
  deleted: number;
  kept: number;
  errors: number;
  retentionDays: number;
};

/**
 * Remove media files that are older than the retention window and are no
 * longer referenced by any media column in the database.
 *
 * Media columns are discovered from information_schema instead of being
 * hard-coded, so new photo/url columns are covered automatically.
 */
export class StorageCleanupService {
  async purgeOrphanFiles(): Promise<StorageCleanupResult> {
    const days = retentionDays();
    const result: StorageCleanupResult = {
      scanned: 0,
      deleted: 0,
      kept: 0,
      errors: 0,
      retentionDays: days,
    };

    const columns = await this.findMediaColumns();
    if (columns.length === 0) {
      // Without a reliable reference list, deleting would be unsafe.
      console.warn('[StorageCleanup] Aucune colonne média détectée — purge annulée.');
      return result;
    }

    const referenced = await this.collectReferencedPaths(columns);
    const maxAgeMs = days * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const dir of UPLOAD_DIRS) {
      const absoluteDir = path.resolve(process.cwd(), dir);
      let entries;
      try {
        entries = await fs.readdir(absoluteDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isFile() || entry.name.startsWith('.')) continue;
        result.scanned += 1;

        const absolutePath = path.join(absoluteDir, entry.name);
        const relativePath = path
          .relative(process.cwd(), absolutePath)
          .split(path.sep)
          .join('/');

        if (this.isReferenced(referenced, entry.name, relativePath, absolutePath)) {
          result.kept += 1;
          continue;
        }

        try {
          const stat = await fs.stat(absolutePath);
          if (now - stat.mtimeMs < maxAgeMs) {
            result.kept += 1;
            continue;
          }
          await fs.unlink(absolutePath);
          result.deleted += 1;
        } catch (error: any) {
          result.errors += 1;
          console.error(`[StorageCleanup] Échec pour ${relativePath}:`, error.message);
        }
      }
    }

    console.log(
      `[StorageCleanup] ${result.deleted} fichier(s) supprimé(s), ${result.kept} conservé(s), ` +
      `${result.scanned} analysé(s), rétention ${days} j.`,
    );
    return result;
  }

  private isReferenced(
    referenced: Set<string>,
    fileName: string,
    relativePath: string,
    absolutePath: string,
  ): boolean {
    return (
      referenced.has(fileName) ||
      referenced.has(relativePath) ||
      referenced.has(`./${relativePath}`) ||
      referenced.has(absolutePath)
    );
  }

  private async findMediaColumns(): Promise<MediaColumn[]> {
    const { rows } = await pool.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text', 'character varying')
        AND (
          column_name LIKE 'photo%'
          OR column_name LIKE 'logo%'
          OR column_name LIKE 'avatar%'
          OR column_name LIKE '%image%'
          OR column_name LIKE '%url'
          OR column_name LIKE '%path'
          OR column_name LIKE '%fichier%'
        )
      ORDER BY table_name, column_name
    `);
    return rows as MediaColumn[];
  }

  private async collectReferencedPaths(columns: MediaColumn[]): Promise<Set<string>> {
    const referenced = new Set<string>();

    for (const { table_name, column_name } of columns) {
      const sql = `SELECT "${column_name}" AS value FROM "${table_name}" WHERE "${column_name}" IS NOT NULL`;
      const { rows } = await pool.query(sql);

      for (const row of rows) {
        const value = row.value;
        if (typeof value !== 'string') continue;

        const trimmed = value.trim();
        if (!trimmed) continue;

        const normalized = trimmed.replace(/\\/g, '/');
        referenced.add(trimmed);
        referenced.add(normalized);
        referenced.add(normalized.replace(/^\.\//, ''));
        referenced.add(path.basename(normalized));
      }
    }

    return referenced;
  }
}

export const storageCleanupService = new StorageCleanupService();
