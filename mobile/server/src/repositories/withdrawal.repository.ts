import { pool } from '../database/db.ts';

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_details: string;
  status: string;
  admin_note?: string;
  created_at: Date;
  updated_at: Date;
}

export class WithdrawalRepository {
  async create(data: Partial<Withdrawal>): Promise<Withdrawal> {
    const query = `
      INSERT INTO withdrawals (user_id, amount, payment_method, payment_details)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      data.user_id,
      data.amount,
      data.payment_method,
      data.payment_details
    ]);
    return rows[0];
  }

  async findByUserId(userId: string): Promise<Withdrawal[]> {
    const query = 'SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC';
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  async updateStatus(id: string, status: string, adminNote?: string): Promise<Withdrawal> {
    const query = `
      UPDATE withdrawals 
      SET status = $1, admin_note = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const { rows } = await pool.query(query, [status, adminNote, id]);
    return rows[0];
  }
}
