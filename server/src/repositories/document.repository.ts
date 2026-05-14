import { pool } from '../database/db.ts';
import { UserDocument } from '../types/database.ts';

export class DocumentRepository {
  /**
   * Register a user's own document
   */
  async createUserDocument(data: Partial<UserDocument>): Promise<UserDocument> {
    const query = `
      INSERT INTO my_documents (
        user_id, type_doc, numero_doc, nom_sur_doc, 
        date_expiration, fingerprint, photo_recto, photo_verso, is_protected
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`;

    const { rows } = await pool.query(query, [
      data.user_id,
      data.type_doc,
      data.numero_doc,
      data.nom_sur_doc,
      data.date_expiration || null,
      data.fingerprint,
      data.photo_recto,
      data.photo_verso,
      data.is_protected !== undefined ? data.is_protected : true
    ]);

    return rows[0];
  }

  /**
   * Find user documents by user ID
   */
  async findUserDocuments(userId: string): Promise<UserDocument[]> {
    const query = 'SELECT * FROM my_documents WHERE user_id = $1 ORDER BY created_at DESC';
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<UserDocument | null> {
    const query = 'SELECT * FROM my_documents WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM my_documents WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, userId: string, data: Partial<UserDocument>): Promise<UserDocument | null> {
    const query = `
      UPDATE my_documents 
      SET 
        type_doc = COALESCE($1, type_doc),
        numero_doc = COALESCE($2, numero_doc),
        nom_sur_doc = COALESCE($3, nom_sur_doc),
        date_expiration = COALESCE($4, date_expiration),
        fingerprint = COALESCE($5, fingerprint),
        photo_recto = COALESCE($6, photo_recto),
        photo_verso = COALESCE($7, photo_verso),
        is_protected = COALESCE($8, is_protected),
        is_lost = COALESCE($9, is_lost)
      WHERE id = $10 AND user_id = $11
      RETURNING *`;

    const { rows } = await pool.query(query, [
      data.type_doc,
      data.numero_doc,
      data.nom_sur_doc,
      data.date_expiration,
      data.fingerprint,
      data.photo_recto,
      data.photo_verso,
      data.is_protected,
      data.is_lost,
      id,
      userId
    ]);

    return rows[0] || null;
  }

  /**
   * Find personal documents matching a specific fingerprint
   * Used for matching found items against private vaults
   */
  async findCandidatesByFingerprint(fingerprint: string): Promise<UserDocument[]> {
    const query = 'SELECT * FROM my_documents WHERE fingerprint = $1';
    const { rows } = await pool.query(query, [fingerprint]);
    return rows;
  }

  /**
   * Update the lost status of a document and link it to a declaration
   */
  async updateLostStatus(id: string, userId: string, isLost: boolean, declarationId: string | null = null): Promise<UserDocument | null> {
    const query = 'UPDATE my_documents SET is_lost = $1, declaration_id = $2 WHERE id = $3 AND user_id = $4 RETURNING *';
    const { rows } = await pool.query(query, [isLost, declarationId, id, userId]);
    return rows[0] || null;
  }
}
