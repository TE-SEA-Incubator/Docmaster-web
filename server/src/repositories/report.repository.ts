import pool from '../database/db.js';
import {
  Report,
  ReportActionType,
  ReportReasonCategory,
  ReportStatus,
  ReportTargetType,
} from '../types/database.ts';

export interface ReportWithReporter extends Report {
  reporter_nom?: string | null;
  reporter_prenom?: string | null;
  reporter_email?: string | null;
  reporter_telephone?: string | null;
  reporter_role?: string | null;
  reporter_is_verified?: boolean | null;
  reporter_blocked_at?: Date | null;
  reporter_blocked_reason?: string | null;
  target_reference?: string | null;
  target_owner?: string | null;
  target_declaration_type?: string | null;
  target_declaration_status?: string | null;
  match_id?: string | null;
  lost_declaration_id?: string | null;
  found_declaration_id?: string | null;
  case_owner_id?: string | null;
  case_finder_id?: string | null;
  target_user_id?: string | null;
  target_user_nom?: string | null;
  target_user_prenom?: string | null;
  target_user_email?: string | null;
  target_user_telephone?: string | null;
  target_user_blocked_at?: Date | null;
  target_user_blocked_reason?: string | null;
  target_user_role?: string | null;
  target_user_is_verified?: boolean | null;
  claim_id?: string | null;
  claim_status?: string | null;
  claim_amount?: number | null;
  claim_currency?: string | null;
  claim_code_expires_at?: Date | null;
  claim_finder_id?: string | null;
  claim_owner_id?: string | null;
  claim_payment_method?: string | null;
}

export class ReportRepository {
  async create(data: {
    reporter_id: string;
    target_type: ReportTargetType;
    target_id: string | null;
    reason_category: ReportReasonCategory;
    description: string;
    context_match_id?: string | null;
  }): Promise<Report> {
    const { rows } = await pool.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason_category, description, context_match_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.reporter_id,
        data.target_type,
        data.target_id,
        data.reason_category,
        data.description,
        data.context_match_id ?? null,
      ],
    );
    return rows[0];
  }

  /**
   * Dernier dossier de récupération du plaignant : une correspondance encore
   * active, ou une remise payée. Sert à rattacher une demande d'aide sans cible.
   */
  async findLatestActiveMatchId(reporterId: string): Promise<string | null> {
    const { rows } = await pool.query(
      `SELECT m.id
       FROM matches m
       JOIN declarations l ON l.id = m.lost_declaration_id
       JOIN declarations f ON f.id = m.found_declaration_id
       LEFT JOIN claims c
         ON c.found_declaration_id = m.found_declaration_id
        AND c.status IN ('PAID', 'VALIDATED')
       WHERE (l.reporter_id = $1 OR f.reporter_id = $1)
         AND (m.status IN ('PENDING', 'CONFIRMED') OR c.id IS NOT NULL)
       ORDER BY (c.status = 'PAID') DESC, m.created_at DESC
       LIMIT 1`,
      [reporterId],
    );
    return rows[0]?.id || null;
  }

  async findOpenByReporterAndTarget(
    reporterId: string,
    targetType: ReportTargetType,
    targetId: string | null,
  ): Promise<Report | null> {
    const { rows } = await pool.query(
      `SELECT * FROM reports
       WHERE reporter_id = $1
         AND target_type = $2
         AND status IN ('OPEN', 'IN_REVIEW')
         AND COALESCE(target_id, '00000000-0000-0000-0000-000000000000'::uuid)
             = COALESCE($3::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
       LIMIT 1`,
      [reporterId, targetType, targetId],
    );
    return rows[0] || null;
  }

  /**
   * Historique du plaignant. Ne renvoie jamais la note interne (`admin_note`) :
   * seul `admin_reply` est destiné à l'utilisateur.
   */
  async findByReporter(reporterId: string): Promise<ReportWithReporter[]> {
    const { rows } = await pool.query(
      `SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason_category,
              r.description, r.status, r.admin_reply, r.resolution_action,
              r.resolved_at, r.created_at, r.updated_at,
              COALESCE(d.identifiant_doc_dm, md.identifiant_doc_dm, mu.identifiant_doc_dm) AS target_reference,
              COALESCE(d.declaration_type, md.declaration_type, mu.declaration_type) AS target_declaration_type,
              COALESCE(d.status, md.status, mu.status) AS target_declaration_status
       FROM reports r
       LEFT JOIN declarations d
         ON r.target_type = 'DECLARATION' AND d.id = r.target_id
       LEFT JOIN matches m
         ON r.target_type = 'MATCH' AND m.id = r.target_id
       LEFT JOIN declarations md ON md.id = m.lost_declaration_id
       LEFT JOIN declarations mu ON mu.id = m.found_declaration_id
       WHERE r.reporter_id = $1
       ORDER BY r.created_at DESC`,
      [reporterId],
    );
    return rows;
  }

  async findAll(status: ReportStatus | null): Promise<ReportWithReporter[]> {
    const { rows } = await pool.query(
      `SELECT r.*,
              u.nom AS reporter_nom,
              u.prenom AS reporter_prenom,
              u.email AS reporter_email,
              u.telephone AS reporter_telephone,
              u.role AS reporter_role,
              u.is_verified AS reporter_is_verified,
              u.blocked_at AS reporter_blocked_at,
              u.blocked_reason AS reporter_blocked_reason,
              COALESCE(d.identifiant_doc_dm, md.identifiant_doc_dm, mu.identifiant_doc_dm) AS target_reference,
              COALESCE(d.owner_name, md.owner_name, mu.owner_name) AS target_owner,
              COALESCE(d.declaration_type, md.declaration_type, mu.declaration_type) AS target_declaration_type,
              COALESCE(d.status, md.status, mu.status) AS target_declaration_status,
              cm.id AS match_id,
              md.id AS lost_declaration_id,
              mu.id AS found_declaration_id,
              md.reporter_id AS case_owner_id,
              mu.reporter_id AS case_finder_id,
              tu.id AS target_user_id,
              tu.nom AS target_user_nom,
              tu.prenom AS target_user_prenom,
              tu.email AS target_user_email,
              tu.telephone AS target_user_telephone,
              tu.blocked_at AS target_user_blocked_at,
              tu.blocked_reason AS target_user_blocked_reason,
              tu.role AS target_user_role,
              tu.is_verified AS target_user_is_verified,
              cl.id AS claim_id,
              cl.status AS claim_status,
              cl.amount AS claim_amount,
              cl.currency AS claim_currency,
              cl.code_expires_at AS claim_code_expires_at,
              cl.finder_id AS claim_finder_id,
              cl.owner_id AS claim_owner_id,
              tx.payment_method AS claim_payment_method
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       LEFT JOIN declarations d
         ON r.target_type = 'DECLARATION' AND d.id = r.target_id
       LEFT JOIN matches m
         ON r.target_type = 'MATCH' AND m.id = r.target_id
       LEFT JOIN conversations cv
         ON r.target_type = 'CONVERSATION' AND cv.id = r.target_id
       -- Le dossier du ticket : cible MATCH, dossier rattaché d'une demande
       -- d'aide, ou correspondance la plus pertinente de la déclaration visée.
       -- Les statuts fermés restent atteignables, une remise déjà payée devant
       -- rester remboursable depuis le signalement.
       LEFT JOIN matches cm ON cm.id = COALESCE(m.id, r.context_match_id,
         (SELECT m2.id FROM matches m2
          WHERE r.target_type = 'DECLARATION'
            AND (m2.lost_declaration_id = d.id OR m2.found_declaration_id = d.id)
          ORDER BY (m2.status IN ('PENDING', 'CONFIRMED')) DESC,
                   (m2.status = 'CONFIRMED') DESC, m2.created_at DESC
          LIMIT 1),
         (SELECT m3.id FROM matches m3
          WHERE r.target_type = 'CONVERSATION'
            AND m3.lost_declaration_id = cv.lost_declaration_id
            AND m3.found_declaration_id = cv.found_declaration_id
          ORDER BY (m3.status IN ('PENDING', 'CONFIRMED')) DESC,
                   (m3.status = 'CONFIRMED') DESC, m3.created_at DESC
          LIMIT 1))
       LEFT JOIN declarations md ON md.id = COALESCE(cm.lost_declaration_id,
         CASE WHEN r.target_type = 'DECLARATION' AND d.declaration_type = 'LOST' THEN d.id END)
       LEFT JOIN declarations mu ON mu.id = COALESCE(cm.found_declaration_id,
         CASE WHEN r.target_type = 'DECLARATION' AND d.declaration_type = 'FOUND' THEN d.id END)
       LEFT JOIN LATERAL (
         SELECT cp.actor_id
         FROM conversation_participants cp
         WHERE cp.conversation_id = cv.id
           AND cp.actor_type = 'USER'
           AND cp.actor_id <> r.reporter_id
         ORDER BY cp.joined_at ASC NULLS LAST
         LIMIT 1
       ) cpart ON true
       -- La partie concernée est l'autre personne du dossier, jamais le
       -- plaignant lui-même : un ticket sur sa propre déclaration n'a pas de
       -- cible tant qu'aucun trouveur n'est rattaché.
       LEFT JOIN users tu ON tu.id = CASE
         WHEN r.target_type = 'USER' THEN r.target_id
         WHEN r.target_type = 'CONVERSATION' THEN cpart.actor_id
         WHEN mu.reporter_id IS NOT NULL AND mu.reporter_id <> r.reporter_id THEN mu.reporter_id
         WHEN md.reporter_id IS NOT NULL AND md.reporter_id <> r.reporter_id THEN md.reporter_id
         WHEN d.reporter_id IS NOT NULL AND d.reporter_id <> r.reporter_id THEN d.reporter_id
         ELSE NULL
       END
       LEFT JOIN LATERAL (
         SELECT c.*
         FROM claims c
         WHERE c.status IN ('PAID', 'VALIDATED')
           AND (
             c.doc_id = md.id
             OR c.found_declaration_id = mu.id
             OR (r.target_type = 'USER' AND (c.owner_id = r.target_id OR c.finder_id = r.target_id))
           )
         ORDER BY (c.status = 'PAID') DESC, c.created_at DESC
         LIMIT 1
       ) cl ON true
       LEFT JOIN transactions tx ON tx.id = cl.transaction_id
       WHERE ($1::text IS NULL OR r.status = $1)
       ORDER BY CASE r.status WHEN 'OPEN' THEN 0 WHEN 'IN_REVIEW' THEN 1 ELSE 2 END,
                r.created_at ASC`,
      [status],
    );
    return rows;
  }

  async findById(id: string): Promise<Report | null> {
    const { rows } = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async review(
    id: string,
    data: { status: ReportStatus; admin_note?: string | null; resolved_by: string },
  ): Promise<Report | null> {
    const resolved = data.status === 'RESOLVED' || data.status === 'DISMISSED';
    const { rows } = await pool.query(
      `UPDATE reports
       SET status = $2,
           admin_note = COALESCE($3, admin_note),
           resolved_by = CASE WHEN $4 THEN $5 ELSE resolved_by END,
           resolved_at = CASE WHEN $4 THEN NOW() ELSE resolved_at END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, data.status, data.admin_note ?? null, resolved, data.resolved_by],
    );
    return rows[0] || null;
  }

  /** Réponse publique de l'administrateur : visible par le plaignant. */
  async recordReply(id: string, reply: string): Promise<Report | null> {
    const { rows } = await pool.query(
      `UPDATE reports
       SET admin_reply = $2,
           status = CASE WHEN status IN ('RESOLVED', 'DISMISSED') THEN status ELSE 'IN_REVIEW' END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, reply],
    );
    return rows[0] || null;
  }

  /** Trace une action métier exécutée depuis le dossier. */
  async recordAction(
    id: string,
    data: {
      action: ReportActionType;
      payload?: Record<string, any> | null;
      status?: ReportStatus;
      admin_note?: string | null;
      resolved_by: string;
    },
  ): Promise<Report | null> {
    const resolved = data.status === 'RESOLVED' || data.status === 'DISMISSED';
    const { rows } = await pool.query(
      `UPDATE reports
       SET resolution_action = $2,
           resolution_payload = $3,
           status = COALESCE($4::text, status),
           admin_note = COALESCE($5::text, admin_note),
           resolved_by = CASE WHEN $6 THEN $7 ELSE resolved_by END,
           resolved_at = CASE WHEN $6 THEN NOW() ELSE resolved_at END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.action,
        data.payload ? JSON.stringify(data.payload) : null,
        data.status ?? null,
        data.admin_note ?? null,
        resolved,
        data.resolved_by,
      ],
    );
    return rows[0] || null;
  }
}
