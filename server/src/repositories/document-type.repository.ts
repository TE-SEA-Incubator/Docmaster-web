import pool from "../database/db.js";
import { DocumentType } from "../types/database.ts";

export class DocumentTypeRepository {
  /**
   * Get all document types
   */
  async findAll(): Promise<DocumentType[]> {
    const query = "SELECT * FROM document_types ORDER BY nom ASC";
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Get all active document types (public)
   */
  async findAllActive(): Promise<DocumentType[]> {
    const query = "SELECT * FROM document_types WHERE is_active = true ORDER BY nom ASC";
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<DocumentType | null> {
    const query = "SELECT * FROM document_types WHERE id = $1";
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find by Code
   */
  async findByCode(code: string): Promise<DocumentType | null> {
    const query = "SELECT * FROM document_types WHERE code = $1";
    const { rows } = await pool.query(query, [code]);
    return rows[0] || null;
  }

  /**
   * Create new document type
   */
  async create(data: Partial<DocumentType>): Promise<DocumentType> {
    const query = `
      INSERT INTO document_types (
        nom, code, description, prix_retrouvaille, finder_percent, 
        app_percent, points_recompense, delai_expiration_mois, icone, categorie, is_active,
        fields, color, bg
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      data.nom,
      data.code,
      data.description,
      data.prix_retrouvaille,
      data.finder_percent,
      data.app_percent,
      data.points_recompense || 0,
      data.delai_expiration_mois,
      data.icone,
      data.categorie,
      data.is_active !== undefined ? data.is_active : true,
      data.fields,
      data.color,
      data.bg
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Update document type
   */
  async update(id: string, data: Partial<DocumentType>): Promise<DocumentType | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (['nom', 'code', 'description', 'prix_retrouvaille', 'finder_percent', 'app_percent', 'points_recompense', 'delai_expiration_mois', 'icone', 'categorie', 'is_active', 'fields', 'color', 'bg'].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) return this.findById(id);

    const query = `
      UPDATE document_types 
      SET ${fields.join(', ')}, updated_at = NOW() 
      WHERE id = $${idx} 
      RETURNING *`;
    
    values.push(id);
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  /**
   * Delete document type
   */
  async delete(id: string): Promise<boolean> {
    const query = "DELETE FROM document_types WHERE id = $1";
    const { rowCount } = await pool.query(query, [id]);
    return (rowCount ?? 0) > 0;
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string): Promise<DocumentType | null> {
    const query = `
      UPDATE document_types 
      SET is_active = NOT is_active, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *`;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }
}
