import { pool } from '../database/db.ts';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentShare {
  id?: string;
  document_id: string;
  user_id: string;
  share_token: string;
  expires_at?: Date | null;
  is_revoked?: boolean;
  view_count?: number;
  created_at?: Date;
}

export class ShareRepository {
  /**
   * Create a new share record
   */
  async createShare(data: DocumentShare): Promise<DocumentShare> {
    const query = `
      INSERT INTO document_shares (
        document_id, user_id, share_token, expires_at
      ) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *`;

    const { rows } = await pool.query(query, [
      data.document_id,
      data.user_id,
      data.share_token,
      data.expires_at || null
    ]);

    return rows[0];
  }

  /**
   * Find share by token
   */
  async findByToken(token: string): Promise<DocumentShare | null> {
    const query = `
      SELECT ds.*, md.type_doc, md.numero_doc, md.nom_sur_doc, md.photo_recto, md.photo_verso, u.nom as owner_name
      FROM document_shares ds
      JOIN my_documents md ON ds.document_id = md.id
      JOIN users u ON ds.user_id = u.id
      WHERE ds.share_token = $1 AND ds.is_revoked = FALSE
      AND (ds.expires_at IS NULL OR ds.expires_at > NOW())
    `;
    const { rows } = await pool.query(query, [token]);
    return rows[0] || null;
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    await pool.query('UPDATE document_shares SET view_count = view_count + 1 WHERE id = $1', [id]);
  }

  /**
   * Revoke a share
   */
  async revokeShare(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      'UPDATE document_shares SET is_revoked = TRUE WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount || 0) > 0;
  }

  /**
   * List shares for a document
   */
  async findByDocumentId(documentId: string, userId: string): Promise<DocumentShare[]> {
    const { rows } = await pool.query(
      'SELECT * FROM document_shares WHERE document_id = $1 AND user_id = $2 ORDER BY created_at DESC',
      [documentId, userId]
    );
    return rows;
  }
}
