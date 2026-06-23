import pool from '../database/db.js';

export interface PushToken {
  id?: string;
  user_id: string;
  token: string;
  platform: string;
  created_at?: Date;
  updated_at?: Date;
}

export class PushTokenRepository {
  async upsert(data: { user_id: string; token: string; platform: string }): Promise<PushToken> {
    const query = `
      INSERT INTO push_tokens (user_id, token, platform)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, token)
      DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()
      RETURNING *
    `;
    const { rows } = await pool.query(query, [data.user_id, data.token, data.platform]);
    return rows[0];
  }

  async findByUserId(userId: string): Promise<PushToken[]> {
    const query = 'SELECT * FROM push_tokens WHERE user_id = $1';
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  async findAllTokens(): Promise<PushToken[]> {
    const query = 'SELECT DISTINCT ON (token) * FROM push_tokens WHERE token IS NOT NULL AND token != \'\'';
    const { rows } = await pool.query(query);
    return rows;
  }

  async delete(userId: string, token: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      'DELETE FROM push_tokens WHERE user_id = $1 AND token = $2',
      [userId, token]
    );
    return (rowCount ?? 0) > 0;
  }

  async deleteAllForUser(userId: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);
    return (rowCount ?? 0) > 0;
  }
}
