import pool from '../database/db.js';

export interface Notification {
  id?: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  is_read?: boolean;
  channels?: any;
  created_at?: Date;
}

export class NotificationRepository {
  async create(data: Notification): Promise<Notification> {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, metadata, channels)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.user_id,
      data.type,
      data.title,
      data.message,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.channels ? JSON.stringify(data.channels) : JSON.stringify({ push: true, email: true })
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    const query = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC';
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  async markAsRead(id: string): Promise<boolean> {
    const query = 'UPDATE notifications SET is_read = true WHERE id = $1';
    const { rowCount } = await pool.query(query, [id]);
    return (rowCount ?? 0) > 0;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const query = 'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false';
    const { rowCount } = await pool.query(query, [userId]);
    return (rowCount ?? 0) > 0;
  }
}
