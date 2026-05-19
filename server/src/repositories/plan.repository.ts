import { query } from '../database/db.ts';

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: any;
  is_active: boolean;
  is_featured: boolean;
  duration_months: number;
}

class PlanRepository {
  async findAll() {
    const result = await query('SELECT * FROM plans ORDER BY price ASC');
    return result.rows;
  }

  async findById(id: string) {
    const result = await query('SELECT * FROM plans WHERE id = $1', [id]);
    return result.rows[0];
  }

  async update(id: string, data: Partial<Plan>) {
    const fields = [];
    const values = [];
    let i = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${i++}`);
      values.push(data.name);
    }
    if (data.price !== undefined) {
      fields.push(`price = $${i++}`);
      values.push(data.price);
    }
    if (data.interval !== undefined) {
      fields.push(`interval = $${i++}`);
      values.push(data.interval);
    }
    if (data.features !== undefined) {
      fields.push(`features = $${i++}`);
      values.push(JSON.stringify(data.features));
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${i++}`);
      values.push(data.is_active);
    }
    if (data.is_featured !== undefined) {
      fields.push(`is_featured = $${i++}`);
      values.push(data.is_featured);
    }
    if (data.duration_months !== undefined) {
      fields.push(`duration_months = $${i++}`);
      values.push(data.duration_months);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const sql = `UPDATE plans SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await query(sql, values);
    return result.rows[0];
  }

  async create(plan: Plan) {
    const sql = `
      INSERT INTO plans (id, name, price, interval, features, is_active, is_featured, duration_months)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      plan.id,
      plan.name,
      plan.price,
      plan.interval || 'month',
      JSON.stringify(plan.features || {}),
      plan.is_active ?? true,
      plan.is_featured ?? false,
      plan.duration_months || 1
    ];
    const result = await query(sql, params);
    return result.rows[0];
  }

  async getFeatureDefinitions() {
    const sql = `SELECT * FROM feature_definitions ORDER BY id ASC`;
    const result = await query(sql);
    return result.rows;
  }
}

export const planRepository = new PlanRepository();
