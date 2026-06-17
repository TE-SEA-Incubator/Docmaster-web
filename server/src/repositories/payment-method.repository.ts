import { pool } from '../database/db.ts';

export interface SavedPaymentMethod {
  id: string;
  user_id: string;
  method_type: string;
  account_name?: string;
  account_number: string;
  bank_name?: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export class PaymentMethodRepository {
  async findbyUserId(userId: string): Promise<SavedPaymentMethod[]> {
    const query = 'SELECT * FROM saved_payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC';
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  async findById(id: string): Promise<SavedPaymentMethod | null> {
    const query = 'SELECT * FROM saved_payment_methods WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async create(data: Partial<SavedPaymentMethod>): Promise<SavedPaymentMethod> {
    const query = `
      INSERT INTO saved_payment_methods (user_id, method_type, account_name, account_number, bank_name, is_default)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      data.user_id, data.method_type, data.account_name, data.account_number, data.bank_name, data.is_default || false
    ]);
    return rows[0];
  }

  async update(id: string, data: Partial<SavedPaymentMethod>): Promise<SavedPaymentMethod | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.method_type !== undefined) { fields.push(`method_type = $${idx++}`); values.push(data.method_type); }
    if (data.account_name !== undefined) { fields.push(`account_name = $${idx++}`); values.push(data.account_name); }
    if (data.account_number !== undefined) { fields.push(`account_number = $${idx++}`); values.push(data.account_number); }
    if (data.bank_name !== undefined) { fields.push(`bank_name = $${idx++}`); values.push(data.bank_name); }
    if (data.is_default !== undefined) { fields.push(`is_default = $${idx++}`); values.push(data.is_default); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);
    const query = `UPDATE saved_payment_methods SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM saved_payment_methods WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  async clearDefault(userId: string): Promise<void> {
    await pool.query('UPDATE saved_payment_methods SET is_default = false WHERE user_id = $1', [userId]);
  }

  async setDefault(id: string, userId: string): Promise<SavedPaymentMethod | null> {
    await this.clearDefault(userId);
    return this.update(id, { is_default: true });
  }
}
