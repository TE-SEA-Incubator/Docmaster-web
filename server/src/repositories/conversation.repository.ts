import { pool, query } from '../database/db.js';
import { Actor, ActorType } from '../utils/actor.utils.ts';

export interface ConversationRow {
  id: string;
  claim_id: string | null;
  lost_declaration_id: string;
  found_declaration_id: string | null;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  opened_at: string;
  closed_at: string | null;
}

export interface ConversationSummary extends ConversationRow {
  identifiant_doc_dm: string | null;
  doc_type_nom: string | null;
  owner_name: string | null;
  ville: string | null;
  quartier: string | null;
  declaration_status: string | null;
  claim_status: string | null;
  counterpart_type: ActorType | null;
  counterpart_id: string | null;
  counterpart_role: 'OWNER' | 'FINDER' | null;
  counterpart_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_type: ActorType | null;
  unread_count: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_type: ActorType;
  sender_id: string;
  body: string;
  kind: 'TEXT' | 'SYSTEM';
  created_at: string;
}

export type ConversationFilter = 'all' | 'unread' | 'archived';

const FILTERS: Record<ConversationFilter, string> = {
  all: `c.status <> 'ARCHIVED'`,
  unread: `c.status <> 'ARCHIVED' AND EXISTS (
      SELECT 1 FROM messages mu
      WHERE mu.conversation_id = c.id
        AND mu.created_at > me.last_read_at
        AND (mu.sender_type, mu.sender_id) <> (me.actor_type, me.actor_id)
  )`,
  archived: `c.status = 'ARCHIVED'`,
};

const LIST_SQL = `
  SELECT c.id, c.claim_id, c.lost_declaration_id, c.found_declaration_id, c.status,
         c.opened_at, c.closed_at,
         d.identifiant_doc_dm, d.owner_name, d.ville, d.quartier,
         d.status AS declaration_status,
         cl.status AS claim_status,
         dt.nom AS doc_type_nom,
         other.actor_type AS counterpart_type,
         other.actor_id AS counterpart_id,
         other.actor_role AS counterpart_role,
         COALESCE(
           CONCAT_WS(' ', ou.prenom, ou.nom),
           NULLIF(CONCAT_WS(' ', op.prenom_contact, op.nom_contact), ''),
           op.nom_organisation
         ) AS counterpart_name,
         lm.body AS last_message,
         lm.created_at AS last_message_at,
         lm.sender_type AS last_sender_type,
         (
           SELECT COUNT(*)::int FROM messages m
           WHERE m.conversation_id = c.id
             AND m.created_at > me.last_read_at
             AND (m.sender_type, m.sender_id) <> (me.actor_type, me.actor_id)
         ) AS unread_count
  FROM conversations c
  JOIN conversation_participants me
    ON me.conversation_id = c.id AND me.actor_type = $1 AND me.actor_id = $2
  LEFT JOIN conversation_participants other
    ON other.conversation_id = c.id
   AND (other.actor_type, other.actor_id) <> (me.actor_type, me.actor_id)
  LEFT JOIN users ou ON other.actor_type = 'USER' AND ou.id = other.actor_id
  LEFT JOIN partenaires op ON other.actor_type = 'PARTENAIRE' AND op.id = other.actor_id
  LEFT JOIN declarations d ON d.id = c.lost_declaration_id
  LEFT JOIN document_types dt ON dt.id::text = d.doc_type OR dt.code = d.doc_type
  LEFT JOIN claims cl ON cl.id = c.claim_id
  LEFT JOIN LATERAL (
    SELECT m.body, m.created_at, m.sender_type
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  WHERE `;

export class ConversationRepository {
  async createPair(
    claimId: string | null,
    lostDeclarationId: string,
    foundDeclarationId: string
  ): Promise<ConversationRow> {
    const inserted = await query(
      `INSERT INTO conversations (claim_id, lost_declaration_id, found_declaration_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (lost_declaration_id, found_declaration_id) DO NOTHING
       RETURNING *`,
      [claimId, lostDeclarationId, foundDeclarationId]
    );
    if (inserted.rows.length > 0) return inserted.rows[0];

    const existing = await query('SELECT * FROM conversations WHERE lost_declaration_id = $1 AND found_declaration_id = $2', [
      lostDeclarationId,
      foundDeclarationId,
    ]);
    return existing.rows[0];
  }

  async findById(conversationId: string): Promise<ConversationRow | null> {
    const { rows } = await query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
    return rows[0] ?? null;
  }

  async addParticipant(conversationId: string, actor: Actor, role: 'OWNER' | 'FINDER'): Promise<void> {
    await query(
      `INSERT INTO conversation_participants (conversation_id, actor_type, actor_id, actor_role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (conversation_id, actor_type, actor_id) DO NOTHING`,
      [conversationId, actor.type, actor.id, role]
    );
  }

  async findMembership(conversationId: string, actor: Actor): Promise<{ actor_role: string } | null> {
    const { rows } = await query(
      `SELECT actor_role FROM conversation_participants
       WHERE conversation_id = $1 AND actor_type = $2 AND actor_id = $3`,
      [conversationId, actor.type, actor.id]
    );
    return rows[0] ?? null;
  }

  async listParticipants(conversationId: string): Promise<Array<{ actor_type: ActorType; actor_id: string }>> {
    const { rows } = await query(
      'SELECT actor_type, actor_id FROM conversation_participants WHERE conversation_id = $1',
      [conversationId]
    );
    return rows;
  }

  async listByActor(actor: Actor, filter: ConversationFilter): Promise<ConversationSummary[]> {
    const { rows } = await pool.query(`${LIST_SQL}${FILTERS[filter]}
      ORDER BY COALESCE(lm.created_at, c.opened_at) DESC
      LIMIT 100`, [actor.type, actor.id]);
    return rows;
  }

  async insertMessage(
    conversationId: string,
    sender: Actor,
    body: string,
    kind: 'TEXT' | 'SYSTEM' = 'TEXT'
  ): Promise<MessageRow> {
    const { rows } = await query(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, body, kind)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [conversationId, sender.type, sender.id, body, kind]
    );
    return rows[0];
  }

  /** Le fil est trié décroissant en SQL puis inversé : le client reçoit du plus ancien au plus récent. */
  async listMessages(conversationId: string, before: string | null, limit = 50): Promise<MessageRow[]> {
    const params: any[] = [conversationId];
    let sql = 'SELECT * FROM messages WHERE conversation_id = $1';
    if (before) {
      params.push(before);
      sql += ` AND created_at < $${params.length}`;
    }
    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const { rows } = await query(sql, params);
    return rows.reverse();
  }

  async markRead(conversationId: string, actor: Actor): Promise<void> {
    await query(
      `UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND actor_type = $2 AND actor_id = $3`,
      [conversationId, actor.type, actor.id]
    );
  }

  async setStatus(conversationId: string, status: 'CLOSED' | 'ARCHIVED' | 'OPEN'): Promise<ConversationRow | null> {
    const { rows } = await query(
      `UPDATE conversations
       SET status = $2, closed_at = CASE WHEN $3 = 'OPEN' THEN NULL ELSE CURRENT_TIMESTAMP END
       WHERE id = $1 RETURNING *`,
      // Le statut est lié deux fois : affecté à la colonne VARCHAR puis comparé à une
      // littérale text, un seul paramètre serait déduit avec deux types incompatibles.
      [conversationId, status, status]
    );
    return rows[0] ?? null;
  }
}

export const conversationRepository = new ConversationRepository();
