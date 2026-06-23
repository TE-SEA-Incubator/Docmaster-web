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
        date_expiration, date_delivrance, nom_autorite, notes,
        fingerprint, photo_recto, photo_verso, is_protected,
        validity_option, is_archived, archived_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`;

    // Auto-archive if validity_option=EXPIRING and date_expiration is already in the past
    const dateExp = data.date_expiration ? new Date(data.date_expiration) : null;
    const shouldArchive = !!(
      data.is_archived ||
      (data.validity_option === 'EXPIRING' && dateExp && dateExp.getTime() < Date.now())
    );
    const archivedAt = shouldArchive ? new Date() : (data.archived_at || null);

    const { rows } = await pool.query(query, [
      data.user_id,
      data.type_doc,
      data.numero_doc,
      data.nom_sur_doc,
      data.date_expiration || null,
      data.date_delivrance || null,
      data.nom_autorite || null,
      data.notes || null,
      data.fingerprint,
      data.photo_recto,
      data.photo_verso,
      data.is_protected !== undefined ? data.is_protected : true,
      data.validity_option || 'EXPIRING',
      shouldArchive,
      archivedAt
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
        date_delivrance = COALESCE($5, date_delivrance),
        nom_autorite = COALESCE($6, nom_autorite),
        notes = COALESCE($7, notes),
        fingerprint = COALESCE($8, fingerprint),
        photo_recto = COALESCE($9, photo_recto),
        photo_verso = COALESCE($10, photo_verso),
        is_protected = COALESCE($11, is_protected),
        is_lost = COALESCE($12, is_lost),
        validity_option = COALESCE($13, validity_option),
        is_archived = COALESCE($14, is_archived),
        archived_at = COALESCE($15, archived_at)
      WHERE id = $16 AND user_id = $17
      RETURNING *`;

    const { rows } = await pool.query(query, [
      data.type_doc,
      data.numero_doc,
      data.nom_sur_doc,
      data.date_expiration,
      data.date_delivrance,
      data.nom_autorite,
      data.notes,
      data.fingerprint,
      data.photo_recto,
      data.photo_verso,
      data.is_protected,
      data.is_lost,
      data.validity_option,
      data.is_archived,
      data.archived_at,
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

  /**
   * Find expiring documents (validity_option = 'EXPIRING', not archived, expiring within N days)
   */
  async findExpiringDocuments(daysAhead: number): Promise<UserDocument[]> {
    const query = `
      SELECT * FROM my_documents
      WHERE validity_option = 'EXPIRING'
        AND is_archived = false
        AND date_expiration IS NOT NULL
        AND date_expiration <= CURRENT_DATE + $1::integer
        AND date_expiration > CURRENT_DATE
        AND expiration_reminded = false
      ORDER BY date_expiration ASC
    `;
    const { rows } = await pool.query(query, [daysAhead]);
    return rows;
  }

  /**
   * Archive all expired documents (validity_option = 'EXPIRING', date_expiration < NOW())
   */
  async archiveExpiredDocuments(): Promise<number> {
    const query = `
      UPDATE my_documents
      SET is_archived = true,
          archived_at = NOW()
      WHERE validity_option = 'EXPIRING'
        AND is_archived = false
        AND date_expiration IS NOT NULL
        AND date_expiration < CURRENT_DATE
      RETURNING id
    `;
    const { rows } = await pool.query(query);
    return rows.length;
  }

  /**
   * Mark a document as reminded for expiration
   */
  async markExpirationReminded(id: string): Promise<void> {
    await pool.query(
      'UPDATE my_documents SET expiration_reminded = true, expiration_reminded_at = NOW() WHERE id = $1',
      [id]
    );
  }
}
