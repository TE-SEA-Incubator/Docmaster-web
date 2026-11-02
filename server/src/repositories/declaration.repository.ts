import pool from "../database/db.js";
import { DocumentDeclaration } from "../types/database.ts";
import { bumpCacheVersion } from "../cache/cache.ts";
import { PUBLIC_SEARCH_VERSION } from "../cache/keys.ts";

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
        declaration_type, status, reporter_id, reporter_type, ville, region, pays, 
        fingerprint, found_location, etat_physique, photo_recto, 
        photo_verso, description, date_expiration, mode_contact, 
        payment_status, transactions_id, date_naissance, urgence_niveau, recompense_montant, date_perte,
        telephone_contact, email_contact, quartier, metadata, department, arrondissement, client_request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
      ON CONFLICT (reporter_id, client_request_id) WHERE client_request_id IS NOT NULL
      DO UPDATE SET client_request_id = EXCLUDED.client_request_id
      RETURNING *, (xmax = 0) AS __was_created
    `;

    const values = [
      data.identifiant_doc_dm,
      data.doc_type,
      data.owner_name,
      data.document_number,
      data.declaration_type,
      data.status || "AVAILABLE",
      data.reporter_id,
      data.reporter_type || 'USER',
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
      data.quartier || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.department || null,
      data.arrondissement || null,
      data.client_request_id || null,
    ];

    const { rows } = await pool.query(query, values);
    await bumpCacheVersion(PUBLIC_SEARCH_VERSION);
    return rows[0];
  }

  async findByClientRequestId(reporterId: string, clientRequestId: string): Promise<DocumentDeclaration | null> {
    const { rows } = await pool.query(
      'SELECT * FROM declarations WHERE reporter_id = $1 AND client_request_id = $2 LIMIT 1',
      [reporterId, clientRequestId],
    );
    return rows[0] || null;
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
   * Find public FOUND declarations (limit prevents huge public responses).
   */
  async findPublicFound(limit = Number(process.env.PUBLIC_SEARCH_LIMIT || 100), docTypeKey = ""): Promise<DocumentDeclaration[]> {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 100;
    const query = `
      SELECT d.*,
             normalize_doc_type(d.doc_type) AS doc_type_id,
             json_build_object('nom', dt.nom, 'code', dt.code) AS "docTypeInfo"
      FROM declarations d
      LEFT JOIN document_types dt ON dt.id = normalize_doc_type(d.doc_type)
      WHERE d.declaration_type = 'FOUND' AND d.status = 'AVAILABLE'
        AND ($2 = '' OR normalize_doc_type(d.doc_type) = (
          SELECT id FROM document_types
          WHERE id::text = $2 OR UPPER(code) = UPPER($2) OR UPPER(nom) = UPPER($2)
          LIMIT 1
        ))
      ORDER BY d.created_at DESC
      LIMIT $1
    `;
    const { rows } = await pool.query(query, [safeLimit, docTypeKey]);
    return rows;
  }

  /**
   * Derniers documents trouvés publics d'un type, tous statuts sauf CANCELLED.
   * `docTypeKey` accepte un id, un code ou un libellé : normalize_doc_type() canonise.
   * Contrairement à findPublicFound, on n'exige pas AVAILABLE : la page détail d'un
   * type doit aussi montrer les documents déjà appariés ou retournés.
   */
  async findPublicFoundByDocType(docTypeKey: string, limit = 8) {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 8;
    const query = `
      SELECT d.*,
             normalize_doc_type(d.doc_type) AS doc_type_id,
             json_build_object('nom', dt.nom, 'code', dt.code) AS "docTypeInfo"
      FROM declarations d
      LEFT JOIN document_types dt ON dt.id = normalize_doc_type(d.doc_type)
      WHERE d.declaration_type = 'FOUND'
        AND d.status <> 'CANCELLED'
        AND normalize_doc_type(d.doc_type) = (
          SELECT id FROM document_types
          WHERE id::text = $1 OR UPPER(code) = UPPER($1) OR UPPER(nom) = UPPER($1)
          LIMIT 1
        )
      ORDER BY d.created_at DESC
      LIMIT $2
    `;
    const { rows } = await pool.query(query, [docTypeKey, safeLimit]);
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
    if (rows[0]) await bumpCacheVersion(PUBLIC_SEARCH_VERSION);
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
  async search(filters: any): Promise<{ rows: DocumentDeclaration[]; total: number }> {
    if (filters.type && !filters.declaration_type) {
      filters.declaration_type = filters.type;
    }
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

    if (filters.search) {
      query += ` AND (owner_name ILIKE $${paramIndex} OR document_number ILIKE $${paramIndex} OR identifiant_doc_dm ILIKE $${paramIndex})`;
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const { rows: countRows } = await pool.query(countQuery, values);
    const total = parseInt(countRows[0].count);

    const page = filters.page ? parseInt(filters.page) : 1;
    const limit = filters.limit ? parseInt(filters.limit) : 20;
    const offset = (page - 1) * limit;

    query += " ORDER BY created_at DESC";
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return { rows, total };
  }

  /**
   * Public fuzzy search for FOUND documents
   */
  async searchPublicFound(searchText: string, docTypeKey = ""): Promise<DocumentDeclaration[]> {
    const query = `
      SELECT d.*,
             similarity(d.owner_name, $1) as score,
             normalize_doc_type(d.doc_type) AS doc_type_id,
             json_build_object('nom', dt.nom, 'code', dt.code) AS "docTypeInfo"
      FROM declarations d
      LEFT JOIN document_types dt ON dt.id = normalize_doc_type(d.doc_type)
      WHERE d.declaration_type = 'FOUND'
      AND d.status = 'AVAILABLE'
      AND (
        d.owner_name % $1
        OR d.document_number % $1
        OR d.identifiant_doc_dm % $1
        OR UPPER(COALESCE(dt.code, '')) = UPPER($1)
        OR similarity(COALESCE(dt.nom, ''), $1) >= 0.2
        OR similarity(COALESCE(dt.code, ''), $1) >= 0.2
      )
      AND ($2 = '' OR normalize_doc_type(d.doc_type) = (
        SELECT id FROM document_types
        WHERE id::text = $2 OR UPPER(code) = UPPER($2) OR UPPER(nom) = UPPER($2)
        LIMIT 1
      ))
      ORDER BY score DESC
      LIMIT 20
    `;
    const { rows } = await pool.query(query, [searchText, docTypeKey]);
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
      SELECT * FROM declarations d
      WHERE (
        d.doc_type = $1 
        OR d.doc_type ILIKE $2
        OR (d.doc_type ILIKE 'passport' AND $2 ILIKE 'passeport') 
        OR (d.doc_type ILIKE 'passeport' AND $2 ILIKE 'passport')
      )
      AND d.declaration_type = $3
      AND (
        ($3 = 'LOST' AND d.status = 'SEARCHING')
        OR ($3 = 'FOUND' AND d.status IN ('AVAILABLE', 'MATCHED'))
      )
      AND NOT EXISTS (
        SELECT 1 FROM recovery_reservations rr
        WHERE rr.found_declaration_id = d.id
          AND rr.status IN ('RESERVED', 'PAID')
      )
      AND NOT EXISTS (
        SELECT 1 FROM claims c
        WHERE c.found_declaration_id = d.id
          AND c.status IN ('PAID', 'VALIDATED')
      )
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
   * FOUND declarations created by a reporter inside a rolling window.
   * Used to enforce the anti-abuse limit (2 findings per 10 minutes).
   */
  async countRecentFoundByReporter(
    reporterId: string,
    minutes: number,
  ): Promise<{ count: number; oldest: Date | null }> {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count, MIN(created_at) AS oldest
       FROM declarations
       WHERE reporter_id = $1
         AND declaration_type = 'FOUND'
         AND created_at > NOW() - make_interval(mins => $2)`,
      [reporterId, minutes],
    );
    return { count: rows[0].count, oldest: rows[0].oldest };
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
        quartier = COALESCE($18, quartier),
        mode_contact = COALESCE($19, mode_contact),
        found_location = COALESCE($20, found_location)
      WHERE id = $21 AND reporter_id = $22
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
      data.quartier,
      data.mode_contact,
      data.found_location ? JSON.stringify(data.found_location) : null,
      id,
      reporterId,
    ]);

    if (rows[0]) await bumpCacheVersion(PUBLIC_SEARCH_VERSION);
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
    if ((rowCount ?? 0) > 0) await bumpCacheVersion(PUBLIC_SEARCH_VERSION);
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
          d.*,
          COALESCE(dt.nom, 
            CASE 
              WHEN LOWER(TRIM(d.doc_type)) IN ('passport', 'passeport') THEN 'Passeport'
              WHEN LOWER(TRIM(d.doc_type)) IN ('cni', 'carte d''identité', 'attestation') THEN 'CNI'
              ELSE INITCAP(REPLACE(REPLACE(TRIM(d.doc_type), '_', ' '), '-', ' '))
            END
          ) as normalized_type
        FROM declarations d
        LEFT JOIN document_types dt ON (
          d.doc_type = dt.id::text
          OR LOWER(d.doc_type) = LOWER(dt.code)
        )
        WHERE d.declaration_type = 'FOUND'
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

  /**
   * KPIs par type de document canonique pour les documents trouvés (FOUND)
   * Normalise declarations.doc_type (uuid, code, nom en clair, variantes)
   * vers les types de document_types, puis agrège les KPIs par type.
   * @param period 'day', 'week', 'month', 'year'
   */
  async getStatsByType(period: string = "month") {
    let interval = "1 month";
    if (period === "day") interval = "1 day";
    if (period === "week") interval = "1 week";
    if (period === "year") interval = "1 year";

    const query = `
      WITH normalized_docs AS (
        SELECT
          d.*,
          COALESCE(
            normalize_doc_type(d.doc_type),
            (SELECT id FROM document_types WHERE code = 'AUTRES' LIMIT 1)
          ) AS doc_type_id
        FROM declarations d
      ),
      current_period AS (
        SELECT
          doc_type_id,
          COUNT(*) FILTER (WHERE declaration_type = 'FOUND' AND status <> 'CANCELLED') AS total,
          0 AS lost,
          COUNT(*) FILTER (WHERE declaration_type = 'FOUND' AND status <> 'CANCELLED') AS found,
          COUNT(*) FILTER (WHERE status = 'RETURNED') AS returned
        FROM normalized_docs
        WHERE created_at >= NOW() - $1::interval
          AND declaration_type = 'FOUND' AND status <> 'CANCELLED'
        GROUP BY doc_type_id
      ),
      previous_period AS (
        SELECT doc_type_id, COUNT(*) AS total
        FROM normalized_docs
        WHERE created_at >= NOW() - ($1::interval * 2)
          AND created_at < NOW() - $1::interval
          AND declaration_type = 'FOUND' AND status <> 'CANCELLED'
        GROUP BY doc_type_id
      ),
      items_list AS (
        SELECT
          doc_type_id,
          json_agg(
            json_build_object(
              'id', id,
              'type', declaration_type,
              'ville', ville,
              'date', created_at,
              'doc_type_raw', doc_type
            ) ORDER BY created_at DESC
          ) AS items
        FROM normalized_docs
        WHERE created_at >= NOW() - $1::interval
          AND declaration_type = 'FOUND' AND status <> 'CANCELLED'
        GROUP BY doc_type_id
      )
      SELECT
        dt.id AS id,
        dt.code AS code,
        dt.nom AS name,
        dt.categorie AS categorie,
        dt.icone AS icone,
        COALESCE(c.total, 0)::int AS total,
        COALESCE(c.lost, 0)::int AS lost,
        COALESCE(c.found, 0)::int AS found,
        COALESCE(c.returned, 0)::int AS returned,
        COALESCE(p.total, 0)::int AS previous_count,
        CASE
          WHEN COALESCE(p.total, 0) = 0 AND COALESCE(c.total, 0) > 0 THEN 100
          WHEN COALESCE(p.total, 0) = 0 AND COALESCE(c.total, 0) = 0 THEN 0
          ELSE ROUND(((COALESCE(c.total, 0) - COALESCE(p.total, 0))::numeric / GREATEST(p.total, 1)) * 100, 1)
        END AS trend,
        i.items AS recent_items
      FROM document_types dt
      LEFT JOIN current_period c ON c.doc_type_id = dt.id
      LEFT JOIN previous_period p ON p.doc_type_id = dt.id
      LEFT JOIN items_list i ON i.doc_type_id = dt.id
      WHERE COALESCE(c.total, 0) > 0
      ORDER BY c.total DESC, dt.nom ASC
    `;

    const { rows } = await pool.query(query, [interval]);
    console.log("📊 Stats by type:", rows.length);
    return rows;
  }
}
