import { pool } from '../database/db.js';

export class TransactionRepository {
  /**
   * Create a new transaction
   */
  async create(data: {
    user_id: string;
    amount: number;
    currency?: string;
    status: string;
    payment_method: string;
    type: string;
    external_ref?: string;
    metadata?: any;
  }) {
    const query = `
      INSERT INTO transactions (
        user_id, amount, currency, status, payment_method, type, external_ref, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      data.user_id,
      data.amount,
      data.currency || 'XAF',
      data.status,
      data.payment_method,
      data.type,
      data.external_ref || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    ]);
    return rows[0];
  }

  /**
   * Update transaction status
   */
  async updateStatus(id: string, status: string, externalRef?: string) {
    const query = `
      UPDATE transactions 
      SET status = $1, external_ref = COALESCE($2, external_ref)
      WHERE id = $3 
      RETURNING *
    `;
    const { rows } = await pool.query(query, [status, externalRef || null, id]);
    return rows[0];
  }

  /**
   * Find all by user
   */
  async findByUser(userId: string) {
    const query = 'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC';
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  /**
   * Find by user and type
   */
  async findByUserAndType(userId: string, type: string) {
    const query = 'SELECT * FROM transactions WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC';
    const { rows } = await pool.query(query, [userId, type]);
    return rows;
  }

  /**
   * Admin: Get all transactions
   */
  async getAll() {
    const query = `
      SELECT t.*, u.nom as user_nom, u.prenom as user_prenom, u.email as user_email
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }
}
