import pool from '../database/db.js';
import { DeletionRequest, DeletionReasonType, DeletionRequestStatus } from '../types/database.ts';

export class DeletionRequestRepository {
  /**
   * Create a new deletion request
   */
  async create(data: {
    declaration_id: string;
    user_id: string;
    reason: string;
    reason_type: DeletionReasonType;
  }): Promise<DeletionRequest> {
    const query = `
      INSERT INTO deletion_requests (
        declaration_id, user_id, reason, reason_type, status
      ) VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      data.declaration_id,
      data.user_id,
      data.reason,
      data.reason_type
    ]);
    return rows[0];
  }

  /**
   * Get all pending deletion requests (for admin)
   */
  async getPending(): Promise<DeletionRequest[]> {
    const query = `
      SELECT dr.*, 
             d.doc_type, d.owner_name, d.declaration_type, d.created_at as declared_at,
             u.nom, u.prenom, u.email
      FROM deletion_requests dr
      JOIN declarations d ON dr.declaration_id = d.id
      JOIN users u ON dr.user_id = u.id
      WHERE dr.status = 'PENDING'
      ORDER BY dr.created_at ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Get deletion requests for a specific user
   */
  async getByUserId(userId: string): Promise<DeletionRequest[]> {
    const query = `
      SELECT * FROM deletion_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  /**
   * Get a specific deletion request by ID
   */
  async findById(id: string): Promise<DeletionRequest | null> {
    const query = 'SELECT * FROM deletion_requests WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Check if a deletion request exists for a declaration
   */
  async existsForDeclaration(declarationId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM deletion_requests
        WHERE declaration_id = $1 AND status IN ('PENDING', 'APPROVED')
      )
    `;
    const { rows } = await pool.query(query, [declarationId]);
    return rows[0].exists;
  }

  /**
   * Approve a deletion request
   */
  async approve(id: string, adminId: string, adminComment?: string): Promise<DeletionRequest | null> {
    const query = `
      UPDATE deletion_requests
      SET 
        status = 'APPROVED',
        admin_id = $2,
        admin_comment = $3,
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id, adminId, adminComment || null]);
    return rows[0] || null;
  }

  /**
   * Reject a deletion request
   */
  async reject(id: string, adminId: string, adminComment: string): Promise<DeletionRequest | null> {
    const query = `
      UPDATE deletion_requests
      SET 
        status = 'REJECTED',
        admin_id = $2,
        admin_comment = $3,
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id, adminId, adminComment]);
    return rows[0] || null;
  }

  /**
   * Mark deletion as executed (after actually deleting the declaration)
   */
  async markExecuted(id: string): Promise<DeletionRequest | null> {
    const query = `
      UPDATE deletion_requests
      SET 
        status = 'EXECUTED',
        executed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Get deletion request by declaration ID
   */
  async findByDeclarationId(declarationId: string): Promise<DeletionRequest | null> {
    const query = `
      SELECT * FROM deletion_requests
      WHERE declaration_id = $1 AND status IN ('PENDING', 'APPROVED')
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [declarationId]);
    return rows[0] || null;
  }
}
