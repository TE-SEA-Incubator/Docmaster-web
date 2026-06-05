import pool from "../database/db.js";
import { DocumentDeclaration } from "../types/database.ts";

export class DeclarationRepository {
  /**
   * Create a new declaration
   */
  async create(
    data: Partial<DocumentDeclaration>,
  ): Promise<DocumentDeclaration> {
    const query = `
      INSERT INTO declarations (
        identifiant_doc_dm, doc_type, owner_name, document_number, 
        declaration_type, status, reporter_id, ville, region, pays, 
        fingerprint, found_location, etat_physique, photo_recto, 
        photo_verso, description, date_expiration, mode_contact, 
        payment_status, transactions_id, date_naissance, urgence_niveau, recompense_montant, date_perte,
        telephone_contact, email_contact
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING *
    `;

    const values = [
      data.identifiant_doc_dm,
      data.doc_type,
      data.owner_name,
      data.document_number,
      data.declaration_type,
      data.status || "AVAILABLE",
      data.reporter_id,
      data.ville,
      data.region,
      data.pays,
      data.fingerprint,
      data.found_location ? JSON.stringify(data.found_location) : null,
      data.etat_physique,
      data.photo_recto,
      data.photo_verso,
      data.description,
      data.date_expiration || null,
      data.mode_contact || "APP_CHAT",
      data.payment_status || "PENDING",
      data.transactions_id || null,
      data.date_naissance || null,
      data.urgence_niveau || "Modérée",
      data.recompense_montant || 0,
      data.date_perte || null,
      data.telephone_contact || null,
      data.email_contact || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Find declarations by reporter ID
   */
  async findByReporterId(reporterId: string): Promise<DocumentDeclaration[]> {
    const query =
      "SELECT * FROM declarations WHERE reporter_id = $1 ORDER BY created_at DESC";
    const { rows } = await pool.query(query, [reporterId]);
    return rows;
  }

  /**
   * Count declarations by reporter ID
   */
  async countByReporterId(reporterId: string): Promise<number> {
    const query = "SELECT COUNT(*) FROM declarations WHERE reporter_id = $1";
    const { rows } = await pool.query(query, [reporterId]);
    return parseInt(rows[0].count);
  }

  /**
   * Find all available declarations (for search)
   */
  async findAllAvailable(): Promise<DocumentDeclaration[]> {
    const query =
      "SELECT * FROM declarations WHERE status = 'AVAILABLE' ORDER BY created_at DESC";
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<DocumentDeclaration | null> {
    const query = "SELECT * FROM declarations WHERE id = $1";
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Update status
   */
  async updateStatus(
    id: string,
    status: string,
  ): Promise<DocumentDeclaration | null> {
    const query =
      "UPDATE declarations SET status = $1 WHERE id = $2 RETURNING *";
    const { rows } = await pool.query(query, [status, id]);
    return rows[0] || null;
  }

  /**
   * Count declarations for a specific year and month
   */
  async countByMonth(year: number, month: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM declarations 
      WHERE EXTRACT(YEAR FROM created_at) = $1 
      AND EXTRACT(MONTH FROM created_at) = $2
    `;
    const { rows } = await pool.query(query, [year, month]);
    return parseInt(rows[0].count);
  }

  /**
   * Find by fingerprint
   */
  async findByFingerprint(fingerprint: string): Promise<DocumentDeclaration[]> {
    const query =
      "SELECT * FROM declarations WHERE fingerprint = $1 AND status != 'RETURNED'";
    const { rows } = await pool.query(query, [fingerprint]);
    return rows;
  }

  /**
   * Search declarations with filters
   */
  async search(filters: any): Promise<DocumentDeclaration[]> {
    let query = "SELECT * FROM declarations WHERE 1=1";
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    } else if (!filters.include_all) {
      query += " AND status = 'AVAILABLE'";
    }

    if (filters.doc_type) {
      query += ` AND doc_type = $${paramIndex++}`;
      values.push(filters.doc_type);
    }

    if (filters.ville) {
      query += ` AND ville ILIKE $${paramIndex++}`;
      values.push(`%${filters.ville}%`);
    }

    if (filters.declaration_type) {
      query += ` AND declaration_type = $${paramIndex++}`;
      values.push(filters.declaration_type);
    }

    query += " ORDER BY created_at DESC";
    const { rows } = await pool.query(query, values);
    return rows;
  }

  /**
   * Public fuzzy search for FOUND documents
   */
  async searchPublicFound(searchText: string): Promise<DocumentDeclaration[]> {
    const query = `
      SELECT *, 
             similarity(owner_name, $1) as score
      FROM declarations 
      WHERE declaration_type = 'FOUND' 
      AND status = 'AVAILABLE'
      AND (owner_name % $1 OR document_number % $1 OR identifiant_doc_dm % $1)
      ORDER BY score DESC
      LIMIT 20
    `;
    const { rows } = await pool.query(query, [searchText]);
    return rows;
  }

  /**
   * Find potential candidates for matching (opposite type, same doc_type)
   */
  async findCandidatesForMatch(
    docTypeId: string,
    docTypeCode: string,
    oppositeType: string,
  ): Promise<DocumentDeclaration[]> {
    // We match by exact ID OR by code (ILIKE).
    // This allows matching between new ID-based records and legacy code-based records.
    const query = `
      SELECT * FROM declarations 
      WHERE (
        doc_type = $1 
        OR doc_type ILIKE $2
        OR (doc_type ILIKE 'passport' AND $2 ILIKE 'passeport') 
        OR (doc_type ILIKE 'passeport' AND $2 ILIKE 'passport')
      )
      AND declaration_type = $3
      AND status NOT IN ('RETURNED', 'CLAIMED', 'CANCELLED')
    `;
    const { rows } = await pool.query(query, [docTypeId, docTypeCode, oppositeType]);
    return rows;
  }

  /**
   * Check for duplicate declarations (same type, same fingerprint)
   */
  async checkDuplicate(
    fingerprint: string,
    declarationType: string,
  ): Promise<DocumentDeclaration | null> {
    const query = `
      SELECT * FROM declarations 
      WHERE fingerprint = $1 
      AND declaration_type = $2 
      AND status NOT IN ('RETURNED', 'CANCELLED')
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [fingerprint, declarationType]);
    return rows[0] || null;
  }

  /**
   * Update a declaration
   */
  async update(
    id: string,
    reporterId: string,
    data: Partial<DocumentDeclaration>,
  ): Promise<DocumentDeclaration | null> {
    const query = `
      UPDATE declarations 
      SET 
        doc_type = COALESCE($1, doc_type),
        owner_name = COALESCE($2, owner_name),
        document_number = COALESCE($3, document_number),
        status = COALESCE($4, status),
        ville = COALESCE($5, ville),
        region = COALESCE($6, region),
        pays = COALESCE($7, pays),
        description = COALESCE($8, description),
        etat_physique = COALESCE($9, etat_physique),
        recompense_montant = COALESCE($10, recompense_montant),
        urgence_niveau = COALESCE($11, urgence_niveau),
        date_naissance = COALESCE($12, date_naissance),
        date_perte = COALESCE($13, date_perte),
        transactions_id = COALESCE($14, transactions_id),
        date_expiration = COALESCE($15, date_expiration),
        telephone_contact = COALESCE($16, telephone_contact),
        email_contact = COALESCE($17, email_contact),
        mode_contact = COALESCE($18, mode_contact),
        found_location = COALESCE($19, found_location)
      WHERE id = $20 AND reporter_id = $21
      RETURNING *`;

    const { rows } = await pool.query(query, [
      data.doc_type,
      data.owner_name,
      data.document_number,
      data.status,
      data.ville,
      data.region,
      data.pays,
      data.description,
      data.etat_physique,
      data.recompense_montant,
      data.urgence_niveau,
      data.date_naissance,
      data.date_perte,
      data.transactions_id,
      data.date_expiration,
      data.telephone_contact,
      data.email_contact,
      data.mode_contact,
      data.found_location ? JSON.stringify(data.found_location) : null,
      id,
      reporterId,
    ]);

    return rows[0] || null;
  }

  /**
   * Hard delete a declaration
   */
  async hardDelete(
    id: string,
    reporterId: string,
  ): Promise<boolean> {
    const query = "DELETE FROM declarations WHERE id = $1 AND reporter_id = $2";
    const { rowCount } = await pool.query(query, [id, reporterId]);
    return (rowCount ?? 0) > 0;
  }

  async getGlobalStats() {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE declaration_type = 'LOST') as total_lost,
        COUNT(*) FILTER (WHERE status = 'RETURNED') as total_recovered
      FROM declarations
    `;
    const { rows } = await pool.query(query);
    return {
      total_lost: parseInt(rows[0].total_lost),
      total_recovered: parseInt(rows[0].total_recovered),
    };
  }

  /**
   * Get performance stats by document type with trend percentage
   * @param period 'day', 'week', 'month', 'year'
   */
  async getPerformanceStats(period: string = "month") {
    let interval = "1 month";
    if (period === "day") interval = "1 day";
    if (period === "week") interval = "1 week";
    if (period === "year") interval = "1 year";

    const query = `
      WITH normalized_docs AS (
        SELECT 
          *,
          CASE 
            WHEN LOWER(TRIM(doc_type)) IN ('passport', 'passeport') THEN 'Passeport'
            WHEN LOWER(TRIM(doc_type)) IN ('cni', 'carte d''identité', 'attestation') THEN 'CNI'
            ELSE INITCAP(TRIM(doc_type))
          END as normalized_type
        FROM declarations
        WHERE declaration_type = 'FOUND'
      ),
      current_period AS (
          SELECT normalized_type, COUNT(*) as count
          FROM normalized_docs
          WHERE created_at >= NOW() - INTERVAL '${interval}'
          GROUP BY normalized_type
      ),
      previous_period AS (
          SELECT normalized_type, COUNT(*) as count
          FROM normalized_docs
          WHERE created_at >= NOW() - (INTERVAL '${interval}' * 2)
            AND created_at < NOW() - INTERVAL '${interval}'
          GROUP BY normalized_type
      ),
      items_list AS (
          SELECT 
            normalized_type,
            json_agg(
              json_build_object(
                'id', id,
                'type', declaration_type,
                'ville', ville,
                'date', created_at,
                'doc_type_raw', doc_type
              ) ORDER BY created_at DESC
            ) as items
          FROM normalized_docs
          GROUP BY normalized_type
      )
      SELECT 
          COALESCE(c.normalized_type, p.normalized_type) as name,
          COALESCE(c.count, 0)::int as count,
          COALESCE(p.count, 0)::int as previous_count,
          CASE 
              WHEN COALESCE(p.count, 0) = 0 AND COALESCE(c.count, 0) > 0 THEN 100
              WHEN COALESCE(p.count, 0) = 0 AND COALESCE(c.count, 0) = 0 THEN 0
              ELSE ROUND(((COALESCE(c.count, 0) - COALESCE(p.count, 0))::numeric / GREATEST(p.count, 1)) * 100, 1)
          END as trend,
          i.items as recent_items
      FROM current_period c
      FULL OUTER JOIN previous_period p ON c.normalized_type = p.normalized_type
      LEFT JOIN items_list i ON COALESCE(c.normalized_type, p.normalized_type) = i.normalized_type
      ORDER BY count DESC
    `;

    const { rows } = await pool.query(query);
    console.log("📊 Performance Stats with items:", rows.length);
    return rows;
  }
}
