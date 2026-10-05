import { pool } from '../database/db.ts';

interface PartenaireEarningsRecord {
  id?: string;
  partenaire_id: string;
  type: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: any;
  created_at?: string;
}

export class PartenaireEarningsRepository {
  async create(data: PartenaireEarningsRecord) {
    const query = `
      INSERT INTO partenaire_earnings_history (partenaire_id, type, amount, currency, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      data.partenaire_id,
      data.type,
      data.amount,
      data.currency || 'POINTS',
      data.description || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]);
    return rows[0];
  }

  async findByPartenaire(partenaireId: string, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM partenaire_earnings_history
      WHERE partenaire_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(query, [partenaireId, limit, offset]);
    return rows;
  }

  async countByPartenaire(partenaireId: string) {
    const query = 'SELECT COUNT(*) FROM partenaire_earnings_history WHERE partenaire_id = $1';
    const { rows } = await pool.query(query, [partenaireId]);
    return parseInt(rows[0].count, 10);
  }

  async sumPointsByType(partenaireId: string, type: string) {
    const query = `
      SELECT COALESCE(SUM(amount), 0)::float AS total
      FROM partenaire_earnings_history
      WHERE partenaire_id = $1 AND type = $2 AND currency = 'POINTS'
    `;
    const { rows } = await pool.query(query, [partenaireId, type]);
    return Number(rows[0]?.total || 0);
  }
}
