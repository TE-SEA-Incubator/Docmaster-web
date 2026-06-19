import pool from '../database/db.js';

export interface Device {
  id?: string;
  user_id: string;
  category: string;
  brand: string;
  model: string;
  serial_number_imei: string;
  color: string;
  purchase_date: string;
  purchase_value: number;
  currency: string;
  where_buy: string;
  garantie_end: string;
  assurance?: string;
  photos: string[];
  status: 'SAFE' | 'LOST' | 'STOLEN';
  notes?: string;
  created_at?: Date;
}

export interface UpdateDeviceInput {
  category: string;
  brand: string;
  model: string;
  serial_number_imei: string;
  color: string;
  purchase_date: string;
  purchase_value: number;
  currency: string;
  where_buy: string;
  garantie_end: string;
  assurance?: string;
  photos: string[];
  notes?: string;
}

class DeviceRepository {
  async create(device: Device) {
    const query = `
      INSERT INTO my_devices (
        user_id, category, brand, model, serial_number_imei, color, 
        purchase_date, purchase_value, currency, where_buy, garantie_end, assurance, photos, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    const values = [
      device.user_id,
      device.category,
      device.brand,
      device.model,
      device.serial_number_imei,
      device.color,
      device.purchase_date || null,
      device.purchase_value || 0,
      device.currency || 'XAF',
      device.where_buy || '',
      device.garantie_end || null,
      device.assurance || 'non',
      JSON.stringify(device.photos || []),
      device.status || 'SAFE',
      device.notes || ''
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async findByUserId(userId: string) {
    const query = 'SELECT * FROM my_devices WHERE user_id = $1 ORDER BY created_at DESC';
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  async findById(id: string) {
    const query = 'SELECT * FROM my_devices WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  async updateStatus(id: string, status: string) {
    const query = 'UPDATE my_devices SET status = $1 WHERE id = $2 RETURNING *';
    const { rows } = await pool.query(query, [status, id]);
    return rows[0];
  }

  async update(id: string, device: UpdateDeviceInput) {
    const query = `
      UPDATE my_devices SET
        category = $1,
        brand = $2,
        model = $3,
        serial_number_imei = $4,
        color = $5,
        purchase_date = $6,
        purchase_value = $7,
        currency = $8,
        where_buy = $9,
        garantie_end = $10,
        assurance = $11,
        photos = $12,
        notes = $13
      WHERE id = $14
      RETURNING *
    `;
    const values = [
      device.category,
      device.brand,
      device.model,
      device.serial_number_imei,
      device.color,
      device.purchase_date || null,
      device.purchase_value || 0,
      device.currency || 'XAF',
      device.where_buy || '',
      device.garantie_end || null,
      device.assurance || 'non',
      JSON.stringify(device.photos || []),
      device.notes || '',
      id
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async delete(id: string, userId: string) {
    const query = 'DELETE FROM my_devices WHERE id = $1 AND user_id = $2 RETURNING *';
    const { rows } = await pool.query(query, [id, userId]);
    return rows[0];
  }
  
  async findAnyByIdentifier(identifier: string) {
    // Search by Serial or IMEI
    const query = `
      SELECT d.*, u.nom as owner_last_name, u.prenom as owner_first_name 
      FROM my_devices d
      JOIN users u ON d.user_id = u.id
      WHERE d.serial_number_imei = $1
    `;
    const { rows } = await pool.query(query, [identifier]);
    return rows[0];
  }
}

export const deviceRepository = new DeviceRepository();
