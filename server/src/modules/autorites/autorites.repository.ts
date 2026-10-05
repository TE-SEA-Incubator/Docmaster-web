import pool from "../../database/db.js";
import { Autorite, AutoritePublic } from "../../types/database.ts";

interface AutoriteCreateData {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  mot_de_passe: string;
  niveau: 'HAUTE' | 'NORMAL';
  ville: string;
  region?: string;
  department?: string;
  arrondissement?: string;
  bureau?: string;
  created_by?: string;
}

interface AutoriteUpdateData {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  niveau?: 'HAUTE' | 'NORMAL';
  ville?: string;
  region?: string;
  department?: string;
  arrondissement?: string;
  bureau?: string;
  is_active?: boolean;
}

const PUBLIC_COLUMNS = `
  id, nom, prenom, email, telephone, niveau, ville, region, department, arrondissement, bureau,
  is_active, must_change_password, created_by, created_at, updated_at
`;

export class AutoriteRepository {
  /**
   * Create a new authority
   */
  async create(data: AutoriteCreateData): Promise<Autorite> {
    const query = `
      INSERT INTO autorites (nom, prenom, email, telephone, mot_de_passe, niveau, ville, region, department, arrondissement, bureau, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING ${PUBLIC_COLUMNS}, mot_de_passe
    `;
    const { rows } = await pool.query(query, [
      data.nom, data.prenom, data.email, data.telephone || null,
      data.mot_de_passe, data.niveau, data.ville, data.region || null,
      data.department || null, data.arrondissement || null, data.bureau || null,
      data.created_by || null,
    ]);
    return rows[0];
  }

  /**
   * Find authority by email (for login)
   */
  async findByEmail(email: string): Promise<Autorite | null> {
    const query = `SELECT ${PUBLIC_COLUMNS}, mot_de_passe FROM autorites WHERE LOWER(email) = LOWER($1)`;
    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
  }

  /**
   * Find authority by id
   */
  async findById(id: string): Promise<Autorite | null> {
    const query = `SELECT ${PUBLIC_COLUMNS} FROM autorites WHERE id = $1`;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find authority by id including password (internal use)
   */
  async findByIdWithPassword(id: string): Promise<Autorite | null> {
    const query = `SELECT ${PUBLIC_COLUMNS}, mot_de_passe FROM autorites WHERE id = $1`;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * List all authorities (optionally filtered)
   */
  async findAll(filters?: { niveau?: string; ville?: string; is_active?: boolean }): Promise<AutoritePublic[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters?.niveau) {
      conditions.push(`niveau = $${idx++}`);
      params.push(filters.niveau);
    }
    if (filters?.ville) {
      conditions.push(`ville = $${idx++}`);
      params.push(filters.ville);
    }
    if (filters?.is_active !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      params.push(filters.is_active);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT ${PUBLIC_COLUMNS} FROM autorites ${where} ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  /**
   * Update an authority
   */
  async update(id: string, data: AutoriteUpdateData): Promise<Autorite | null> {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const fields: Record<string, any> = {
      nom: data.nom, prenom: data.prenom, email: data.email,
      telephone: data.telephone, niveau: data.niveau, ville: data.ville,
      region: data.region, department: data.department, arrondissement: data.arrondissement,
      bureau: data.bureau,
      is_active: data.is_active,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        sets.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }
    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    const query = `UPDATE autorites SET ${sets.join(', ')} WHERE id = $${idx} RETURNING ${PUBLIC_COLUMNS}`;
    const { rows } = await pool.query(query, params);
    return rows[0] || null;
  }

  /**
   * Update password and reset must_change_password flag
   */
  async updatePassword(id: string, newHashedPassword: string): Promise<void> {
    const query = `
      UPDATE autorites
      SET mot_de_passe = $1, must_change_password = false, is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(query, [newHashedPassword, id]);
  }

  /**
   * Store a password reset token for an authority
   */
  async setPasswordResetToken(id: string, token: string, expires: Date): Promise<void> {
    await pool.query(
      `UPDATE autorites
       SET password_reset_token = $1, password_reset_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [token, expires, id]
    );
  }

  /**
   * Find an authority by a valid (non-expired) password reset token
   */
  async findByResetToken(token: string): Promise<Autorite | null> {
    const query = `
      SELECT ${PUBLIC_COLUMNS}, mot_de_passe
      FROM autorites
      WHERE password_reset_token = $1 AND password_reset_expires > CURRENT_TIMESTAMP
    `;
    const { rows } = await pool.query(query, [token]);
    return rows[0] || null;
  }

  /**
   * Clear the password reset token after a successful reset
   */
  async clearPasswordResetToken(id: string): Promise<void> {
    await pool.query(
      `UPDATE autorites
       SET password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  }

  /**
   * Delete an authority
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM autorites WHERE id = $1`;
    const { rowCount } = await pool.query(query, [id]);
    return (rowCount ?? 0) > 0;
  }

  /**
   * List authorities created by a given authority (HAUTE)
   */
  async findByCreatedBy(createdBy: string): Promise<AutoritePublic[]> {
    const query = `SELECT ${PUBLIC_COLUMNS} FROM autorites WHERE created_by = $1 ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, [createdBy]);
    return rows;
  }

  /**
   * Count authorities by niveau
   */
  async countByNiveau(niveau: string): Promise<number> {
    const query = `SELECT COUNT(*)::int AS count FROM autorites WHERE niveau = $1`;
    const { rows } = await pool.query(query, [niveau]);
    return rows[0].count;
  }
}
