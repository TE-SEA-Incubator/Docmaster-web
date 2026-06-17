import { pool } from '../database/db.ts';

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface ActivityLogFilters {
  userId?: string;
  actionType?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
  fromDate?: string;
  toDate?: string;
}

export class ActivityLogRepository {
  async log(data: {
    user_id: string | null;
    action_type: string;
    entity_type?: string;
    entity_id?: string;
    description?: string;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<ActivityLog> {
    const query = `
      INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description, metadata, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      data.user_id,
      data.action_type,
      data.entity_type || null,
      data.entity_id || null,
      data.description || null,
      JSON.stringify(data.metadata || {}),
      data.ip_address || null,
      data.user_agent || null,
    ]);
    return rows[0];
  }

  async findAll(filters: ActivityLogFilters = {}): Promise<{ rows: ActivityLog[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.userId) { conditions.push(`user_id = $${idx++}`); values.push(filters.userId); }
    if (filters.actionType) { conditions.push(`action_type = $${idx++}`); values.push(filters.actionType); }
    if (filters.entityType) { conditions.push(`entity_type = $${idx++}`); values.push(filters.entityType); }
    if (filters.fromDate) { conditions.push(`created_at >= $${idx++}`); values.push(filters.fromDate); }
    if (filters.toDate) { conditions.push(`created_at <= $${idx++}`); values.push(filters.toDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM activity_logs ${where}`;
    const { rows: countRows } = await pool.query(countQuery, values);
    const total = parseInt(countRows[0].count, 10);

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const dataQuery = `
      SELECT al.*, u.nom, u.prenom, u.email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);
    const { rows } = await pool.query(dataQuery, values);

    return { rows, total };
  }

  async getDistinctActionTypes(): Promise<string[]> {
    const { rows } = await pool.query('SELECT DISTINCT action_type FROM activity_logs ORDER BY action_type');
    return rows.map(r => r.action_type);
  }
}
