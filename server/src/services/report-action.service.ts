import { getClient, query } from '../database/db.ts';
import { HttpError } from '../utils/http-error.ts';
import { Report, ReportActionSubject, ReportActionType } from '../types/database.ts';
import { ReportRepository } from '../repositories/report.repository.ts';
import { notificationService } from './notification.service.ts';
import { pointsService } from './points.service.ts';
import { activityLogService } from './activity-log.service.ts';
import { restoreStatuses } from '../utils/recovery.utils.ts';
import { TIMING } from '../config/timing.ts';

const reportRepository = new ReportRepository();

interface CaseContext {
  lostId: string | null;
  foundId: string | null;
  matchId: string | null;
  ownerId: string | null;
  finderId: string | null;
  targetUserId: string | null;
  claim: any | null;
  paymentMethod: string | null;
  docType: string | null;
  docTypeName: string;
  reference: string | null;
}

const ACTIVE_MATCHES = `('PENDING', 'CONFIRMED')`;

async function loadMatchContext(
  matchId: string,
  reporterId: string,
): Promise<CaseContext> {
  const { rows } = await query(
    `SELECT m.id, m.lost_declaration_id, m.found_declaration_id,
            l.reporter_id AS lost_reporter, l.doc_type AS lost_doc_type,
            l.identifiant_doc_dm AS lost_reference,
            f.identifiant_doc_dm AS found_reference,
            f.reporter_id AS found_reporter
     FROM matches m
     JOIN declarations l ON l.id = m.lost_declaration_id
     JOIN declarations f ON f.id = m.found_declaration_id
     WHERE m.id = $1`,
    [matchId],
  );
  const row = rows[0];
  if (!row) throw new HttpError(404, 'Correspondance introuvable.');

  return {
    lostId: row.lost_declaration_id,
    foundId: row.found_declaration_id,
    matchId: row.id,
    ownerId: row.lost_reporter,
    finderId: row.found_reporter,
    targetUserId:
      row.found_reporter === reporterId ? row.lost_reporter : row.found_reporter,
    claim: null,
    paymentMethod: null,
    docType: row.lost_doc_type,
    docTypeName: row.lost_doc_type,
    reference: row.lost_reference || row.found_reference || null,
  };
}

async function loadDeclarationContext(
  declarationId: string,
  reporterId: string,
): Promise<CaseContext> {
  const { rows } = await query('SELECT * FROM declarations WHERE id = $1', [declarationId]);
  const decl = rows[0];
  if (!decl) throw new HttpError(404, 'Déclaration introuvable.');

  const matchRes = await query(
    `SELECT * FROM matches
     WHERE (lost_declaration_id = $1 OR found_declaration_id = $1)
       AND status IN ${ACTIVE_MATCHES}
     ORDER BY (status = 'CONFIRMED') DESC, score DESC, created_at DESC
     LIMIT 1`,
    [declarationId],
  );
  const match = matchRes.rows[0] || null;

  const lostId =
    decl.declaration_type === 'LOST' ? decl.id : match?.lost_declaration_id || null;
  const foundId =
    decl.declaration_type === 'FOUND' ? decl.id : match?.found_declaration_id || null;

  let ownerId = decl.declaration_type === 'LOST' ? decl.reporter_id : null;
  let finderId = decl.declaration_type === 'FOUND' ? decl.reporter_id : null;

  if (match) {
    const people = await query(
      `SELECT id, reporter_id FROM declarations WHERE id = ANY($1::uuid[])`,
      [[match.lost_declaration_id, match.found_declaration_id]],
    );
    for (const person of people.rows) {
      if (person.id === match.found_declaration_id) finderId = person.reporter_id;
      if (person.id === match.lost_declaration_id) ownerId = person.reporter_id;
    }
  }

  return {
    lostId,
    foundId,
    matchId: match?.id || null,
    ownerId,
    finderId,
    targetUserId: decl.reporter_id !== reporterId ? decl.reporter_id : null,
    claim: null,
    paymentMethod: null,
    docType: decl.doc_type,
    docTypeName: decl.doc_type,
    reference: decl.identifiant_doc_dm || null,
  };
}

async function loadConversationContext(
  conversationId: string,
  reporterId: string,
): Promise<CaseContext> {
  const { rows } = await query(
    `SELECT * FROM conversations WHERE id = $1`,
    [conversationId],
  );
  const conv = rows[0];
  if (!conv) throw new HttpError(404, 'Conversation introuvable.');

  const counterpart = await query(
    `SELECT actor_id FROM conversation_participants
     WHERE conversation_id = $1 AND actor_type = 'USER' AND actor_id <> $2
     ORDER BY joined_at ASC NULLS LAST
     LIMIT 1`,
    [conversationId, reporterId],
  );

  const lostRes = await query('SELECT * FROM declarations WHERE id = $1', [
    conv.lost_declaration_id,
  ]);
  const foundRes = await query('SELECT * FROM declarations WHERE id = $1', [
    conv.found_declaration_id,
  ]);
  const lost = lostRes.rows[0] || null;
  const found = foundRes.rows[0] || null;

  const matchRes = await query(
    `SELECT id FROM matches
     WHERE lost_declaration_id = $1 AND found_declaration_id = $2
     LIMIT 1`,
    [conv.lost_declaration_id, conv.found_declaration_id],
  );

  return {
    lostId: conv.lost_declaration_id || null,
    foundId: conv.found_declaration_id || null,
    matchId: matchRes.rows[0]?.id || null,
    ownerId: lost?.reporter_id || null,
    finderId: found?.reporter_id || null,
    targetUserId: counterpart.rows[0]?.actor_id || null,
    claim: null,
    paymentMethod: null,
    docType: lost?.doc_type || found?.doc_type || null,
    docTypeName: lost?.doc_type || found?.doc_type || null,
    reference: lost?.identifiant_doc_dm || found?.identifiant_doc_dm || null,
  };
}

async function loadUserContext(userId: string): Promise<CaseContext> {
  const { rows } = await query(
    `SELECT * FROM claims
     WHERE status IN ('PAID', 'VALIDATED')
       AND (owner_id = $1 OR finder_id = $1)
     ORDER BY (status = 'PAID') DESC, created_at DESC
     LIMIT 1`,
    [userId],
  );
  const claim = rows[0] || null;

  return {
    lostId: claim?.doc_id || null,
    foundId: claim?.found_declaration_id || null,
    matchId: null,
    ownerId: claim?.owner_id || null,
    finderId: claim?.finder_id || null,
    targetUserId: userId,
    claim: null,
    paymentMethod: null,
    docType: null,
    docTypeName: 'document',
    reference: null,
  };
}

async function loadClaim(context: CaseContext): Promise<void> {
  if (context.claim || (!context.lostId && !context.foundId)) return;

  const { rows } = await query(
    `SELECT c.*, d.doc_type, d.identifiant_doc_dm AS reference
     FROM claims c
     JOIN declarations d ON d.id = c.doc_id
     WHERE c.status IN ('PAID', 'VALIDATED')
       AND (
         ($1::uuid IS NOT NULL AND c.doc_id = $1)
         OR ($2::uuid IS NOT NULL AND c.found_declaration_id = $2)
       )
     ORDER BY (c.status = 'PAID') DESC, c.created_at DESC
     LIMIT 1`,
    [context.lostId, context.foundId],
  );
  const claim = rows[0] || null;
  context.claim = claim;
  if (!claim) return;

  context.lostId = claim.doc_id;
  context.foundId = claim.found_declaration_id || context.foundId;
  context.ownerId = claim.owner_id;
  context.finderId = claim.finder_id || context.finderId;
  context.docType = claim.doc_type || context.docType;
  context.reference = claim.reference || context.reference;

  if (!context.matchId && context.lostId && context.foundId) {
    const matchRes = await query(
      `SELECT id FROM matches
       WHERE lost_declaration_id = $1 AND found_declaration_id = $2
       LIMIT 1`,
      [context.lostId, context.foundId],
    );
    context.matchId = matchRes.rows[0]?.id || null;
  }

  if (claim.transaction_id) {
    const txRes = await query(
      'SELECT payment_method FROM transactions WHERE id = $1',
      [claim.transaction_id],
    );
    context.paymentMethod = txRes.rows[0]?.payment_method || null;
  }
}

async function loadCase(report: Report): Promise<CaseContext> {
  let context: CaseContext;

  if (report.target_type === 'MATCH' && report.target_id) {
    context = await loadMatchContext(report.target_id, report.reporter_id);
  } else if (report.target_type === 'SUPPORT' && report.context_match_id) {
    context = await loadMatchContext(report.context_match_id, report.reporter_id);
  } else if (report.target_type === 'DECLARATION' && report.target_id) {
    context = await loadDeclarationContext(report.target_id, report.reporter_id);
  } else if (report.target_type === 'CONVERSATION' && report.target_id) {
    context = await loadConversationContext(report.target_id, report.reporter_id);
  } else if (report.target_type === 'USER' && report.target_id) {
    context = await loadUserContext(report.target_id);
  } else {
    context = {
      lostId: null,
      foundId: null,
      matchId: null,
      ownerId: null,
      finderId: null,
      targetUserId: null,
      claim: null,
      paymentMethod: null,
      docType: null,
      docTypeName: 'document',
      reference: null,
    };
  }

  await loadClaim(context);
  if (context.docType) {
    const docType = await query(
      'SELECT nom FROM document_types WHERE code = $1 OR id::text = $1 LIMIT 1',
      [context.docType],
    );
    context.docTypeName = docType.rows[0]?.nom || context.docTypeName;
  }
  return context;
}

function describeDocument(context: CaseContext): string {
  return context.reference
    ? `${context.docTypeName} (${context.reference})`
    : context.docTypeName;
}

async function getOpenReport(reportId: string): Promise<Report> {
  const report = await reportRepository.findById(reportId);
  if (!report) throw new HttpError(404, 'Signalement introuvable.');
  if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
    throw new HttpError(409, 'Ce signalement est déjà clos.');
  }
  return report;
}

function requirePaidClaim(context: CaseContext): any {
  if (!context.claim) {
    throw new HttpError(409, "Ce dossier n'est lié à aucun paiement de récupération.");
  }
  if (context.claim.status === 'VALIDATED') {
    throw new HttpError(409, 'La remise a déjà été validée : le dossier ne peut plus être modifié.');
  }
  if (context.claim.status !== 'PAID') {
    throw new HttpError(409, "Ce dossier n'est lié à aucun paiement en cours.");
  }
  return context.claim;
}

async function notifyUser(
  userId: string | null | undefined,
  data: { type: string; title: string; message: string; metadata?: Record<string, any> },
): Promise<void> {
  if (!userId) return;
  try {
    await notificationService.createNotification({
      user_id: userId,
      destinataire_type: 'USER',
      destinataire_id: userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || {},
    });
  } catch (error) {
    console.error('[ReportAction] Notification failed:', error);
  }
}

export interface ReportActionInput {
  action: ReportActionType;
  adminId: string;
  message?: string;
  reason?: string;
  hours?: number;
  subject?: ReportActionSubject;
}

export class ReportActionService {
  async reply(reportId: string, adminId: string, message: string) {
    const trimmed = String(message || '').trim();
    if (trimmed.length < 2 || trimmed.length > 2000) {
      throw new HttpError(400, 'La réponse doit contenir entre 2 et 2000 caractères.');
    }
    const report = await getOpenReport(reportId);
    const updated = await reportRepository.recordReply(reportId, trimmed);

    await notifyUser(report.reporter_id, {
      type: 'REPORT_REPLY',
      title: 'Réponse du support',
      message: trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed,
      metadata: { reportId, action: 'VIEW_MY_REPORTS' },
    });

    await activityLogService.log({
      user_id: adminId,
      action_type: 'REPORT_REPLY',
      entity_type: 'report',
      entity_id: reportId,
      description: `Réponse au signalement ${reportId.slice(0, 8).toUpperCase()}`,
    });

    return updated;
  }

  async nudgeFinder(reportId: string, adminId: string) {
    const report = await getOpenReport(reportId);
    const context = await loadCase(report);
    const claim = requirePaidClaim(context);
    if (!context.finderId) {
      throw new HttpError(409, 'Aucun trouveur identifié sur ce dossier.');
    }

    await notifyUser(context.finderId, {
      type: 'REPORT_NUDGE',
      title: 'Le support vous demande de finaliser une remise',
      message: `Le propriétaire du ${describeDocument(context)} attend la remise. Merci de le contacter et de valider le code de remise.`,
      metadata: {
        reportId,
        claimId: claim.id,
        foundId: context.foundId,
        action: 'OPEN_HANDOVER',
      },
    });
    await notifyUser(context.ownerId, {
      type: 'REPORT_UPDATE',
      title: 'Le support a relancé le trouveur',
      message: `Une relance a été envoyée au trouveur du ${describeDocument(context)}.`,
      metadata: { reportId, claimId: claim.id, action: 'VIEW_MY_REPORTS' },
    });

    const updated = await reportRepository.recordAction(reportId, {
      action: 'NUDGE_FINDER',
      payload: { claimId: claim.id, finderId: context.finderId },
      status: 'IN_REVIEW',
      resolved_by: adminId,
    });

    await activityLogService.log({
      user_id: adminId,
      action_type: 'REPORT_NUDGE_FINDER',
      entity_type: 'report',
      entity_id: reportId,
      description: `Relance du trouveur sur le dossier ${reportId.slice(0, 8).toUpperCase()}`,
    });

    return updated;
  }

  async regenerateCode(reportId: string, adminId: string, hours?: number) {
    const report = await getOpenReport(reportId);
    const context = await loadCase(report);
    const claim = requirePaidClaim(context);

    const ttlHours = Math.min(
      720,
      Math.max(1, Math.round(Number(hours) || TIMING.claimCodeTtlHours)),
    );
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { rows } = await query(
      `UPDATE claims
       SET verification_code = $2,
           attempts = 0,
           code_expires_at = NOW() + ($3 || ' hours')::interval
       WHERE id = $1 AND status = 'PAID'
       RETURNING id, code_expires_at`,
      [claim.id, code, String(ttlHours)],
    );
    if (rows.length === 0) {
      throw new HttpError(409, 'La réclamation n’est plus au statut payé.');
    }
    const expiresAt = rows[0].code_expires_at;

    await notifyUser(context.ownerId, {
      type: 'HANDOVER_CODE_RENEWED',
      title: 'Nouveau code de remise',
      message: `Le support a émis un nouveau code pour le ${describeDocument(context)} : ${code}. Il expire dans ${ttlHours} h. Partagez-le uniquement avec le trouveur.`,
      metadata: {
        reportId,
        claimId: claim.id,
        foundId: context.foundId,
        expiresAt,
        action: 'VIEW_RECOVERY',
      },
    });
    await notifyUser(context.finderId, {
      type: 'REPORT_UPDATE',
      title: 'Nouveau code de remise disponible',
      message: `Le support a émis un nouveau code de remise pour le ${describeDocument(context)}. Demandez-le au propriétaire pour valider la remise.`,
      metadata: {
        reportId,
        claimId: claim.id,
        foundId: context.foundId,
        action: 'OPEN_HANDOVER',
      },
    });

    const updated = await reportRepository.recordAction(reportId, {
      action: 'REGENERATE_CODE',
      payload: { claimId: claim.id, expiresAt, ttlHours },
      status: 'IN_REVIEW',
      resolved_by: adminId,
    });

    await activityLogService.log({
      user_id: adminId,
      action_type: 'REPORT_REGENERATE_CODE',
      entity_type: 'report',
      entity_id: reportId,
      description: `Nouveau code de remise (${ttlHours} h) pour le dossier ${reportId.slice(0, 8).toUpperCase()}`,
      metadata: { claimId: claim.id, expiresAt },
    });

    return updated;
  }

  /**
   * Clôture le dossier sans remise : la réclamation payée est remboursée
   * (portefeuille interne, ou points si le paiement a été fait en points),
   * la correspondance est close et le document repart en circulation.
   */
  async closeAndRefund(reportId: string, adminId: string, reason?: string) {
    const report = await getOpenReport(reportId);
    const context = await loadCase(report);
    const claim = requirePaidClaim(context);

    if (!context.lostId || !context.foundId) {
      throw new HttpError(409, 'Impossible de résoudre la paire perdu/trouvé de ce dossier.');
    }

    const amount = Number(claim.amount || 0);
    const isPoints = context.paymentMethod === 'POINTS';
    let pointsToRefund = 0;
    if (isPoints && amount > 0) {
      const redemption = await query(
        `SELECT amount FROM earnings_history
         WHERE user_id = $1
           AND type = 'POINTS_REDEMPTION'
           AND metadata->>'docId' = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [claim.owner_id, context.lostId],
      );
      const redeemed = Math.abs(Number(redemption.rows[0]?.amount || 0));
      pointsToRefund = redeemed > 0
        ? Math.round(redeemed)
        : await pointsService.calculatePointsNeeded(amount);
    }

    const client = await getClient();
    let refunded = false;
    try {
      await client.query('BEGIN');
      const locked = await client.query(
        'SELECT * FROM claims WHERE id = $1 FOR UPDATE',
        [claim.id],
      );
      const current = locked.rows[0];
      if (!current || current.status !== 'PAID') {
        throw new HttpError(409, 'Cette réclamation a déjà été clôturée ou validée.');
      }

      if (isPoints && pointsToRefund > 0) {
        await client.query(
          'UPDATE users SET points = COALESCE(points, 0) + $1, updated_at = NOW() WHERE id = $2',
          [pointsToRefund, claim.owner_id],
        );
        await client.query(
          `INSERT INTO earnings_history (user_id, type, amount, currency, description, metadata)
           VALUES ($1, 'POINTS_REFUND', $2, 'POINTS', $3, $4)`,
          [
            claim.owner_id,
            pointsToRefund,
            'Remboursement d’une remise non effectuée',
            JSON.stringify({
              docId: context.lostId,
              matchId: context.matchId,
              foundId: context.foundId,
              claimId: claim.id,
              reportId,
              reason: 'ADMIN_CLOSE_AND_REFUND',
            }),
          ],
        );
        refunded = true;
      } else if (amount > 0) {
        const balanceRes = await client.query(
          'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE',
          [claim.owner_id],
        );
        const balanceBefore = Number(balanceRes.rows[0]?.wallet_balance || 0);
        const balanceAfter = balanceBefore + amount;
        await client.query(
          'UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
          [balanceAfter, claim.owner_id],
        );
        await client.query(
          `INSERT INTO wallet_transactions
             (user_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
           VALUES ($1, $2, $3, $4, 'CREDIT', 'RECOVERY_REFUND', $5, 'claim', $6)`,
          [
            claim.owner_id,
            amount,
            balanceBefore,
            balanceAfter,
            claim.id,
            JSON.stringify({
              docId: context.lostId,
              matchId: context.matchId,
              foundId: context.foundId,
              reportId,
              reason: 'ADMIN_CLOSE_AND_REFUND',
            }),
          ],
        );
        refunded = true;
      }

      await client.query(
        `UPDATE claims
         SET status = 'REFUNDED', code_expires_at = NULL
         WHERE id = $1 AND status = 'PAID'`,
        [claim.id],
      );

      if (context.matchId) {
        await client.query(
          `UPDATE matches
           SET status = 'REJECTED',
               closed_reason = 'ADMIN_CLOSED',
               closed_at = NOW(),
               updated_at = NOW()
           WHERE id = $1 AND status IN ${ACTIVE_MATCHES}`,
          [context.matchId],
        );
      }

      await client.query(
        `UPDATE recovery_reservations
         SET status = 'CANCELLED', updated_at = NOW()
         WHERE (found_declaration_id = $1 OR lost_declaration_id = $2)
           AND status IN ('RESERVED', 'PAID')`,
        [context.foundId, context.lostId],
      );

      await restoreStatuses(client, context.lostId, context.foundId);
      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore
      }
      throw error;
    } finally {
      client.release();
    }

    await notifyUser(context.ownerId, {
      type: 'RECOVERY_REFUNDED',
      title: 'Remboursement effectué',
      message: refunded
        ? isPoints
          ? `Le support a clôturé la récupération du ${describeDocument(context)} et vous a recrédité ${pointsToRefund} points.`
          : `Le support a clôturé la récupération du ${describeDocument(context)} et crédité ${amount.toLocaleString('fr-FR')} XAF sur votre portefeuille.`
        : `Le support a clôturé la récupération du ${describeDocument(context)}. Aucun montant n’a pu être remboursé automatiquement ; contactez le support.`,
      metadata: {
        reportId,
        claimId: claim.id,
        amount: isPoints ? pointsToRefund : amount,
        currency: isPoints ? 'POINTS' : 'XAF',
        action: 'VIEW_WALLET',
      },
    });
    await notifyUser(context.finderId, {
      type: 'MATCH_CLOSED',
      title: 'Récupération clôturée par le support',
      message: `La récupération du ${describeDocument(context)} a été clôturée par le support. Vous n’avez plus à effectuer de remise.`,
      metadata: { reportId, claimId: claim.id, foundId: context.foundId, action: 'VIEW_MY_REPORTS' },
    });

    const updated = await reportRepository.recordAction(reportId, {
      action: 'CLOSE_AND_REFUND',
      payload: {
        claimId: claim.id,
        amount,
        currency: 'XAF',
        paymentMethod: context.paymentMethod,
        points: pointsToRefund,
        matchId: context.matchId,
        refunded,
        reason: reason?.trim() || null,
      },
      status: 'RESOLVED',
      resolved_by: adminId,
    });

    await activityLogService.log({
      user_id: adminId,
      action_type: 'REPORT_CLOSE_AND_REFUND',
      entity_type: 'report',
      entity_id: reportId,
      description: `Clôture et remboursement du dossier ${reportId.slice(0, 8).toUpperCase()} (${isPoints ? pointsToRefund + ' pts' : amount + ' XAF'})`,
      metadata: { claimId: claim.id, amount, points: pointsToRefund, matchId: context.matchId },
    });

    return updated;
  }

  async blockUser(
    reportId: string,
    adminId: string,
    reason?: string,
    subject: ReportActionSubject = 'TARGET',
  ) {
    const report = await getOpenReport(reportId);
    const context = await loadCase(report);
    const subjectUserId = subject === 'REPORTER' ? report.reporter_id : context.targetUserId;
    if (!subjectUserId) {
      throw new HttpError(409, 'Aucun utilisateur cible sur ce dossier.');
    }
    if (subjectUserId === adminId) {
      throw new HttpError(400, 'Vous ne pouvez pas bloquer votre propre compte.');
    }

    const target = await query(
      'SELECT id, role, prenom, nom, blocked_at FROM users WHERE id = $1',
      [subjectUserId],
    );
    const user = target.rows[0];
    if (!user) throw new HttpError(404, 'Utilisateur introuvable.');
    if (user.role === 'ADMIN') {
      throw new HttpError(403, 'Un compte administrateur ne peut pas être bloqué depuis un signalement.');
    }

    const note = String(reason || '').trim();
    await query(
      `UPDATE users
       SET blocked_at = NOW(),
           blocked_reason = $2,
           blocked_by = $3,
           refresh_token_hash = NULL,
           refresh_token_expires = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [subjectUserId, note || null, adminId],
    );

    await notifyUser(subjectUserId, {
      type: 'ACCOUNT_BLOCKED',
      title: 'Votre compte est suspendu',
      message: note
        ? `Votre compte a été suspendu : ${note}. Contactez le support pour plus d’informations.`
        : 'Votre compte a été suspendu. Contactez le support pour plus d’informations.',
      metadata: { reportId, action: 'CONTACT_SUPPORT' },
    });

    const updated = await reportRepository.recordAction(reportId, {
      action: 'BLOCK_USER',
      payload: { userId: subjectUserId, subject, reason: note || null },
      resolved_by: adminId,
    });

    await activityLogService.log({
      user_id: adminId,
      action_type: 'USER_BLOCKED',
      entity_type: 'user',
      entity_id: subjectUserId,
      description: `Compte ${user.prenom} ${user.nom} bloqué depuis le signalement ${reportId.slice(0, 8).toUpperCase()}`,
      metadata: { reportId, reason: note || null, subject },
    });

    return updated;
  }

  async unblockUser(reportId: string, adminId: string, subject: ReportActionSubject = 'TARGET') {
    const report = await reportRepository.findById(reportId);
    if (!report) throw new HttpError(404, 'Signalement introuvable.');
    const context = await loadCase(report);
    const subjectUserId = subject === 'REPORTER' ? report.reporter_id : context.targetUserId;
    if (!subjectUserId) {
      throw new HttpError(409, 'Aucun utilisateur cible sur ce dossier.');
    }

    const target = await query(
      'SELECT id, role, prenom, nom, blocked_at FROM users WHERE id = $1',
      [subjectUserId],
    );
    const user = target.rows[0];
    if (!user) throw new HttpError(404, 'Utilisateur introuvable.');
    if (user.role === 'ADMIN') {
      throw new HttpError(403, 'Action réservée aux comptes utilisateurs.');
    }
    if (!user.blocked_at) {
      throw new HttpError(409, 'Ce compte n’est pas bloqué.');
    }

    await query(
      `UPDATE users
       SET blocked_at = NULL,
           blocked_reason = NULL,
           blocked_by = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [subjectUserId],
    );

    await notifyUser(subjectUserId, {
      type: 'ACCOUNT_UNBLOCKED',
      title: 'Votre compte a été réactivé',
      message: 'Votre compte est de nouveau actif. Merci de respecter les règles de la plateforme.',
      metadata: { reportId, action: 'VIEW_DASHBOARD' },
    });

    const updated = await reportRepository.recordAction(reportId, {
      action: 'UNBLOCK_USER',
      payload: { userId: subjectUserId, subject },
      resolved_by: adminId,
    });

    await activityLogService.log({
      user_id: adminId,
      action_type: 'USER_UNBLOCKED',
      entity_type: 'user',
      entity_id: subjectUserId,
      description: `Compte ${user.prenom} ${user.nom} débloqué depuis le signalement ${reportId.slice(0, 8).toUpperCase()}`,
      metadata: { reportId, subject },
    });

    return updated;
  }

  async apply(reportId: string, input: ReportActionInput) {
    switch (input.action) {
      case 'REPLY':
        return this.reply(reportId, input.adminId, input.message || '');
      case 'NUDGE_FINDER':
        return this.nudgeFinder(reportId, input.adminId);
      case 'REGENERATE_CODE':
        return this.regenerateCode(reportId, input.adminId, input.hours);
      case 'CLOSE_AND_REFUND':
        return this.closeAndRefund(reportId, input.adminId, input.reason);
      case 'BLOCK_USER':
        return this.blockUser(reportId, input.adminId, input.reason, input.subject);
      case 'UNBLOCK_USER':
        return this.unblockUser(reportId, input.adminId, input.subject);
      default:
        throw new HttpError(400, 'Action de dossier inconnue.');
    }
  }
}
