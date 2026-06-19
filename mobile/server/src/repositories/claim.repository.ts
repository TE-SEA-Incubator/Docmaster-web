import { pool } from "../database/db.js";

export class ClaimRepository {
  /**
   * Find a claim by document ID and ensure it's still active (PENDING or PAID)
   */
  async findActiveByDocId(docId: string) {
    const query = `
      SELECT * FROM claims 
      WHERE doc_id = $1 AND status IN ('PENDING', 'PAID')
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [docId]);
    return rows[0];
  }

  /**
   * Update claim status (e.g., to VALIDATED)
   */
  async updateStatus(claimId: string, status: string) {
    const query = `
      UPDATE claims 
      SET status = $1 
      WHERE id = $2 
      RETURNING *
    `;
    const { rows } = await pool.query(query, [status, claimId]);
    return rows[0];
  }

  /**
   * Record a failed attempt
   */
  async incrementAttempts(claimId: string) {
    const query = `
      UPDATE claims 
      SET attempts = attempts + 1 
      WHERE id = $1 
      RETURNING attempts
    `;
    const { rows } = await pool.query(query, [claimId]);
    return rows[0].attempts;
  }

  /**
   * Get claim details with declaration and owner info
   */
  async getFullDetails(claimId: string) {
    const query = `
      SELECT 
        c.*, 
        d.title as doc_title, d.type as doc_type,
        u.email as owner_email, u.prenom as owner_prenom
      FROM claims c
      JOIN declarations d ON c.doc_id = d.id
      JOIN users u ON c.owner_id = u.id
      WHERE c.id = $1
    `;
    const { rows } = await pool.query(query, [claimId]);
    return rows[0];
  }

  /**
   * Create a new claim for document recovery
   */
  async create(claimData: {
    doc_id: string;
    owner_id: string;
    finder_id: string;
    verification_code: string;
    status?: 'PENDING' | 'VALIDATED' | 'FAILED';
  }) {
    const query = `
      INSERT INTO claims (doc_id, owner_id, finder_id, verification_code, status, attempts)
      VALUES ($1, $2, $3, $4, $5, 0)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      claimData.doc_id,
      claimData.owner_id,
      claimData.finder_id,
      claimData.verification_code,
      claimData.status || 'PENDING'
    ]);
    return rows[0];
  }

  /**
   * Find a claim by document ID and owner ID
   */
  async findByDocIdAndOwner(docId: string, ownerId: string) {
    const query = `
      SELECT * FROM claims 
      WHERE doc_id = $1 AND owner_id = $2
      ORDER BY created_at DESC LIMIT 1
    `;
    const { rows } = await pool.query(query, [docId, ownerId]);
    return rows[0];
  }
}
