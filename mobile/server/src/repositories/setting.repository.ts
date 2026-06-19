import { pool } from '../database/db.ts';

export class SettingRepository {
  async getByKey(key: string): Promise<any> {
    const query = 'SELECT value FROM app_settings WHERE key = $1';
    const { rows } = await pool.query(query, [key]);
    return rows[0]?.value;
  }

  async getAll(): Promise<Record<string, any>> {
    const query = 'SELECT key, value FROM app_settings';
    const { rows } = await pool.query(query);
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, any>);
  }

  async update(key: string, value: any): Promise<void> {
    const query = `
      INSERT INTO app_settings (key, value) 
      VALUES ($1, $2) 
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
    `;
    await pool.query(query, [key, JSON.stringify(value)]);
  }
}
