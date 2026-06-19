import { pool } from '../database/db.ts';

interface EarningsRecord {
  id?: string;
  user_id: string;
  type: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: any;
  created_at?: string;
}

export class EarningsRepository {
  async create(data: EarningsRecord) {
    const query = `
      INSERT INTO earnings_history (user_id, type, amount, currency, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      data.user_id,
      data.type,
      data.amount,
      data.currency || 'POINTS',
      data.description || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    ]);
    return rows[0];
  }

  async findByUser(userId: string, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM earnings_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(query, [userId, limit, offset]);
    return rows;
  }

  async countByUser(userId: string) {
    const query = 'SELECT COUNT(*) FROM earnings_history WHERE user_id = $1';
    const { rows } = await pool.query(query, [userId]);
    return parseInt(rows[0].count);
  }

  async findAll(limit = 50, offset = 0) {
    const query = `
      SELECT e.*, u.nom as user_nom, u.prenom as user_prenom, u.email as user_email
      FROM earnings_history e
      JOIN users u ON e.user_id = u.id
      ORDER BY e.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await pool.query(query, [limit, offset]);
    return rows;
  }
}
