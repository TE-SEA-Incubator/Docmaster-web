import { pool } from "../database/db.js";

export class ClaimRepository {
  /**
   * Find a paid claim ready for code validation (doc_id = LOST declaration id)
   */
  async findPaidByDocId(docId: string) {
    const q = `
      SELECT * FROM claims
      WHERE doc_id = $1 AND status = 'PAID'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [docId]);
    return rows[0];
  }

  /**
   * @deprecated Use findPaidByDocId for validation; PENDING claims are not validatable
   */
  async findActiveByDocId(docId: string) {
    return this.findPaidByDocId(docId);
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
    status?: 'PENDING' | 'PAID' | 'VALIDATED' | 'FAILED';
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

  async findByDocIdAndOwner(docId: string, ownerId: string) {
    const query = `
      SELECT * FROM claims 
      WHERE doc_id = $1 AND owner_id = $2
      ORDER BY created_at DESC LIMIT 1
    `;
    const { rows } = await pool.query(query, [docId, ownerId]);
    return rows[0];
  }

  async findByLostAndOwner(lostDocId: string, ownerId: string) {
    return this.findByDocIdAndOwner(lostDocId, ownerId);
  }

  async findPaidByFoundId(foundId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM claims
       WHERE found_declaration_id = $1
         AND status IN ('PAID', 'VALIDATED')
       ORDER BY created_at DESC
       LIMIT 1`,
      [foundId],
    );
    return rows[0] || null;
  }

  async findPaidByLostId(lostId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM claims
       WHERE doc_id = $1
         AND status IN ('PAID', 'VALIDATED')
       ORDER BY created_at DESC
       LIMIT 1`,
      [lostId],
    );
    return rows[0] || null;
  }

  async createForMatch(claimData: {
    doc_id: string;
    found_declaration_id: string;
    owner_id: string;
    finder_id: string;
    verification_code: string;
    status?: 'PENDING' | 'PAID' | 'VALIDATED' | 'FAILED';
    amount?: number | null;
    transaction_id?: string | null;
  }) {
    const { rows } = await pool.query(
      `INSERT INTO claims
         (doc_id, found_declaration_id, owner_id, finder_id, verification_code, status, attempts, amount, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)
       RETURNING *`,
      [
        claimData.doc_id,
        claimData.found_declaration_id,
        claimData.owner_id,
        claimData.finder_id,
        claimData.verification_code,
        claimData.status || 'PAID',
        claimData.amount ?? null,
        claimData.transaction_id ?? null,
      ],
    );
    return rows[0];
  }

  async promoteForMatch(
    claimId: string,
    data: {
      verification_code: string;
      finder_id: string | null;
      found_declaration_id: string;
      amount: number | null;
      transaction_id: string | null;
    },
  ) {
    const { rows } = await pool.query(
      `UPDATE claims
       SET status = 'PAID',
           verification_code = $2,
           finder_id = $3,
           found_declaration_id = $4,
           amount = $5,
           transaction_id = $6
       WHERE id = $1
       RETURNING *`,
      [
        claimId,
        data.verification_code,
        data.finder_id,
        data.found_declaration_id,
        data.amount,
        data.transaction_id,
      ],
    );
    return rows[0] || null;
  }
}
