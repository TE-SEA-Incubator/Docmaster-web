import { Request, Response } from 'express';
import { pool } from '../database/db.ts';
import { ReportRepository } from '../repositories/report.repository.ts';
import { ReportActionService } from '../services/report-action.service.ts';
import { notificationService } from '../services/notification.service.ts';
import { errorStatus, HttpError } from '../utils/http-error.ts';
import {
  ReportActionSubject,
  ReportActionType,
  ReportReasonCategory,
  ReportStatus,
  ReportTargetType,
} from '../types/database.ts';

const reportRepository = new ReportRepository();
const reportActionService = new ReportActionService();

const TARGET_TYPES: ReportTargetType[] = ['DECLARATION', 'MATCH', 'CONVERSATION', 'USER', 'SUPPORT'];
const REASON_CATEGORIES: ReportReasonCategory[] = [
  'WRONG_DOCUMENT',
  'NO_HANDOVER',
  'FRAUD',
  'ABUSIVE',
  'OTHER',
];
const REVIEW_STATUSES: ReportStatus[] = ['IN_REVIEW', 'RESOLVED', 'DISMISSED'];
const REPORT_ACTIONS: ReportActionType[] = [
  'REPLY',
  'NUDGE_FINDER',
  'REGENERATE_CODE',
  'CLOSE_AND_REFUND',
  'BLOCK_USER',
  'UNBLOCK_USER',
];

const REASON_LABELS: Record<ReportReasonCategory, string> = {
  WRONG_DOCUMENT: 'Mauvais document',
  NO_HANDOVER: 'Remise non effectuée',
  FRAUD: 'Fraude',
  ABUSIVE: 'Comportement abusif',
  OTHER: 'Autre',
};

const ACTION_MESSAGES: Record<ReportActionType, string> = {
  REPLY: 'Réponse envoyée au plaignant.',
  NUDGE_FINDER: 'Le trouveur a été relancé.',
  REGENERATE_CODE: 'Nouveau code de remise émis.',
  CLOSE_AND_REFUND: 'Dossier clôturé et remboursement effectué.',
  BLOCK_USER: 'Le compte a été bloqué.',
  UNBLOCK_USER: 'Le compte a été réactivé.',
};

async function notifyUserSafely(
  userId: string | null | undefined,
  data: { type: string; title: string; message: string; metadata?: Record<string, any> },
): Promise<void> {
  if (!userId) return;
  try {
    await notificationService.createNotification({
      user_id: userId,
      destinataire_type: 'USER',
      destinataire_id: userId,
      ...data,
    });
  } catch (error) {
    console.error('[Report] Notification failed:', error);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function assertTargetAccess(
  userId: string,
  targetType: ReportTargetType,
  targetId: string,
): Promise<void> {
  if (targetType === 'DECLARATION') {
    const { rows } = await pool.query('SELECT id FROM declarations WHERE id = $1', [targetId]);
    if (!rows[0]) throw new HttpError(404, 'Déclaration introuvable.');
    return;
  }

  if (targetType === 'MATCH') {
    const { rows } = await pool.query(
      `SELECT l.reporter_id AS lost_reporter, f.reporter_id AS found_reporter
       FROM matches m
       JOIN declarations l ON l.id = m.lost_declaration_id
       JOIN declarations f ON f.id = m.found_declaration_id
       WHERE m.id = $1`,
      [targetId],
    );
    const match = rows[0];
    if (!match) throw new HttpError(404, 'Correspondance introuvable.');
    if (match.lost_reporter !== userId && match.found_reporter !== userId) {
      throw new HttpError(403, 'Vous ne participez pas à cette correspondance.');
    }
    return;
  }

  if (targetType === 'CONVERSATION') {
    const { rows } = await pool.query(
      `SELECT 1 FROM conversation_participants
       WHERE conversation_id = $1 AND actor_type = 'USER' AND actor_id = $2
       LIMIT 1`,
      [targetId, userId],
    );
    if (!rows[0]) throw new HttpError(403, 'Vous ne participez pas à cette conversation.');
    return;
  }

  if (targetType === 'USER') {
    if (targetId === userId) {
      throw new HttpError(400, 'Vous ne pouvez pas vous signaler vous-même.');
    }
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [targetId]);
    if (!rows[0]) throw new HttpError(404, 'Utilisateur introuvable.');
  }
}

export const createReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const targetType = String(req.body?.target_type || '').toUpperCase() as ReportTargetType;
    const reasonCategory = String(req.body?.reason_category || '').toUpperCase() as ReportReasonCategory;
    const description = String(req.body?.description || '').trim();
    const rawTargetId = req.body?.target_id;
    const targetId = targetType === 'SUPPORT' ? null : String(rawTargetId || '');

    if (!TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({ success: false, message: 'Type de cible invalide.' });
    }
    if (!REASON_CATEGORIES.includes(reasonCategory)) {
      return res.status(400).json({ success: false, message: 'Motif de signalement invalide.' });
    }
    if (description.length < 10 || description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Décrivez le problème en 10 à 2000 caractères.',
      });
    }
    if (targetType !== 'SUPPORT' && !UUID_RE.test(targetId as string)) {
      return res.status(400).json({ success: false, message: 'Cible du signalement invalide.' });
    }

    let contextMatchId: string | null = null;

    if (targetType !== 'SUPPORT') {
      await assertTargetAccess(userId, targetType, targetId as string);
      const duplicate = await reportRepository.findOpenByReporterAndTarget(
        userId,
        targetType,
        targetId,
      );
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Vous avez déjà un signalement en cours sur ce sujet.',
          data: duplicate,
        });
      }
    } else {
      const duplicate = await reportRepository.findOpenByReporterAndTarget(
        userId,
        'SUPPORT',
        null,
      );
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Votre demande d’aide précédente est toujours en cours de traitement.',
          data: duplicate,
        });
      }
      // Une demande d'aide arrive souvent en plein litige : on rattache le
      // dossier de récupération en cours pour que l'admin ne lise pas un texte
      // sans savoir de quoi il parle.
      contextMatchId = await reportRepository.findLatestActiveMatchId(userId);
    }

    let report;
    try {
      report = await reportRepository.create({
        reporter_id: userId,
        target_type: targetType,
        target_id: targetId,
        reason_category: reasonCategory,
        description,
        context_match_id: contextMatchId,
      });
    } catch (createError: any) {
      // Deux envois simultanés passent la vérification applicative : l'index
      // unique partiel tranche, on renvoie le même conflit en 409.
      if (createError?.code === '23505') {
        return res.status(409).json({
          success: false,
          message:
            targetType === 'SUPPORT'
              ? 'Votre demande d’aide précédente est toujours en cours de traitement.'
              : 'Vous avez déjà un signalement en cours sur ce sujet.',
        });
      }
      throw createError;
    }

    await notificationService.notifyAdmins(
      targetType === 'SUPPORT' ? 'Nouvelle demande d’aide' : 'Nouveau signalement',
      targetType === 'SUPPORT'
        ? `${description.slice(0, 160)}`
        : `${REASON_LABELS[reasonCategory]} — ${description.slice(0, 160)}`,
      'ALERT',
      {
        reportId: report.id,
        targetType,
        targetId,
        reasonCategory,
        contextMatchId,
        action: 'OPEN_REPORTS',
      },
    );

    res.status(201).json({
      success: true,
      message:
        targetType === 'SUPPORT'
          ? 'Votre demande a été transmise au support.'
          : 'Signalement transmis. Notre équipe va l’examiner.',
      data: report,
    });
  } catch (error: any) {
    res.status(errorStatus(error, 500)).json({ success: false, message: error.message });
  }
};

export const getMyReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    const reports = await reportRepository.findByReporter(userId);
    res.json({ success: true, count: reports.length, data: reports });
  } catch (error: any) {
    res.status(errorStatus(error, 500)).json({ success: false, message: error.message });
  }
};

export const listReports = async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Accès admin requis' });
    }
    const statusParam = String(req.query.status || '').toUpperCase();
    const status = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'].includes(statusParam)
      ? (statusParam as ReportStatus)
      : null;
    const reports = await reportRepository.findAll(status);
    res.json({
      success: true,
      count: reports.length,
      open: reports.filter((r) => r.status === 'OPEN').length,
      data: reports,
    });
  } catch (error: any) {
    res.status(errorStatus(error, 500)).json({ success: false, message: error.message });
  }
};

export const reviewReport = async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Accès admin requis' });
    }
    const adminId = (req as any).user?.id;
    const id = req.params.id as string;
    const status = String(req.body?.status || '').toUpperCase() as ReportStatus;
    const adminNote = req.body?.admin_note ? String(req.body.admin_note).trim() : null;

    if (!REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide. Valeurs acceptées : IN_REVIEW, RESOLVED, DISMISSED.',
      });
    }
    if (adminNote && adminNote.length > 2000) {
      return res.status(400).json({ success: false, message: 'Note trop longue (2000 caractères max).' });
    }

    const existing = await reportRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Signalement introuvable.' });
    }

    const updated = await reportRepository.review(id, {
      status,
      admin_note: adminNote,
      resolved_by: adminId,
    });

    if (existing.status !== status) {
      const messages: Record<ReportStatus, { title: string; type: string }> = {
        OPEN: { title: 'Signalement réouvert', type: 'REPORT_UPDATE' },
        IN_REVIEW: { title: 'Signalement en cours de traitement', type: 'REPORT_UPDATE' },
        RESOLVED: { title: 'Signalement résolu', type: 'REPORT_RESOLVED' },
        DISMISSED: { title: 'Signalement classé', type: 'REPORT_DISMISSED' },
      };
      const meta = messages[status];
      await notifyUserSafely(existing.reporter_id, {
        type: meta.type,
        title: meta.title,
        message:
          status === 'RESOLVED'
            ? 'Votre signalement a été traité par notre équipe.'
            : status === 'DISMISSED'
              ? 'Votre signalement a été examiné et classé sans suite.'
              : 'Votre signalement est en cours de traitement par notre équipe.',
        metadata: { reportId: id, action: 'VIEW_MY_REPORTS' },
      });
    }

    res.json({ success: true, message: 'Signalement mis à jour.', data: updated });
  } catch (error: any) {
    res.status(errorStatus(error, 500)).json({ success: false, message: error.message });
  }
};

/**
 * Exécute une action métier depuis un signalement.
 * POST /api/reports/admin/:id/actions
 */
export const applyReportAction = async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Accès admin requis' });
    }
    const adminId = (req as any).user?.id;
    const id = String(req.params.id || '');
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ success: false, message: 'Signalement invalide.' });
    }

    const action = String(req.body?.action || '').toUpperCase() as ReportActionType;
    if (!REPORT_ACTIONS.includes(action)) {
      return res.status(400).json({ success: false, message: 'Action inconnue.' });
    }

    const hours = req.body?.hours !== undefined ? Number(req.body.hours) : undefined;
    if (action === 'REGENERATE_CODE' && hours !== undefined && !Number.isFinite(hours)) {
      return res.status(400).json({ success: false, message: 'Durée invalide.' });
    }

    // Le blocage peut viser la partie concernée (défaut) ou le plaignant
    // lui-même : un ticket abusif ou une fausse déclaration n'ont pas d'autre
    // compte en cause.
    const rawSubject = String(req.body?.subject || '').toUpperCase();
    if (rawSubject && !['TARGET', 'REPORTER'].includes(rawSubject)) {
      return res.status(400).json({ success: false, message: 'Compte à sanctionner invalide.' });
    }
    const subject: ReportActionSubject = rawSubject === 'REPORTER' ? 'REPORTER' : 'TARGET';

    const updated = await reportActionService.apply(id, {
      action,
      adminId,
      message: req.body?.message ? String(req.body.message) : undefined,
      reason: req.body?.reason ? String(req.body.reason) : undefined,
      hours,
      subject,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Signalement introuvable.' });
    }

    res.json({ success: true, message: ACTION_MESSAGES[action], data: updated });
  } catch (error: any) {
    res.status(errorStatus(error, 500)).json({ success: false, message: error.message });
  }
};
