import { Request, Response } from 'express';
import { payRecovery as processPayRecovery } from './payment.controller.ts';
import { validateRecoveryCode } from '../services/recovery-validation.service.ts';
import { ClaimRepository } from '../repositories/claim.repository.ts';
import { resolveLostFoundPair } from '../utils/recovery.utils.ts';
import { query } from '../database/db.ts';

const claimRepo = new ClaimRepository();

export class RecoveryController {
  /**
   * POST /api/recovery/pay
   * Propriétaire : Déclenche et paye la récupération du document (MoMo ou Points)
   */
  async payRecovery(req: Request, res: Response) {
    return processPayRecovery(req, res);
  }

  /**
   * GET /api/recovery/status/:docId
   * Obtenir l'état de récupération d'un document et son code secret (si propriétaire et payé)
   */
  async getRecoveryStatus(req: Request, res: Response) {
    try {
      const { docId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const docIdStr = Array.isArray(docId) ? docId[0] : docId;
      const matchId = typeof req.query?.matchId === 'string' ? req.query.matchId : undefined;
      const pair = await resolveLostFoundPair(docIdStr, matchId);

      if (!pair || !pair.lostDecl) {
        return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
      }

      const lostId = pair.lostId;
      let claim = null;
      if (pair.foundId && typeof (claimRepo as any).findPaidByFoundId === 'function') {
        claim = await claimRepo.findPaidByFoundId(pair.foundId);
      }
      claim = claim || (await claimRepo.findPaidByDocId(lostId));

      if (!claim) {
        return res.status(200).json({
          success: true,
          status: 'UNPAID',
          message: 'Aucune réclamation payée pour ce document',
          data: {
            paid: false,
            declaration: pair.lostDecl,
            foundId: pair.foundId,
            matchId: pair.matchId,
            matchStatus: pair.match?.status ?? null,
            ownerConfirmedAt: pair.match?.owner_confirmed_at ?? null,
          },
        });
      }

      const isOwner = pair.lostDecl.reporter_id === userId;
      const isFinder = claim.finder_id === userId || pair.foundDecl?.reporter_id === userId;

      return res.status(200).json({
        success: true,
        status: claim.status,
        data: {
          id: claim.id,
          doc_id: claim.doc_id,
          status: claim.status,
          created_at: claim.created_at,
          foundId: claim.found_declaration_id || pair.foundId,
          matchId: pair.matchId,
          paid: claim.status === 'PAID' || claim.status === 'VALIDATED',
          // Révéler le code secret uniquement au propriétaire
          verification_code: isOwner ? claim.verification_code : undefined,
          isOwner,
          isFinder,
        },
      });
    } catch (error: any) {
      console.error('Error in getRecoveryStatus:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/recovery/validate
   * Trouveur : Saisit et valide le code secret à 6 chiffres lors de la remise physique
   */
  async validateCode(req: Request, res: Response) {
    try {
      const { docId, code } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      if (!docId || !code) {
        return res.status(400).json({
          success: false,
          message: 'L\'ID du document et le code de vérification sont requis',
        });
      }

      const result = await validateRecoveryCode(docId, userId, code);
      return res.json(result);
    } catch (error: any) {
      const msg = error.message || 'Erreur lors de la validation du code';
      const status =
        msg.includes('non autorisé') || msg.includes('trouveur') ? 403 :
        msg.includes('Trop de tentatives') ? 403 :
        msg.includes('payée') || msg.includes('Aucune') ? 404 :
        msg.includes('invalide') ? 401 : 400;
      return res.status(status).json({ success: false, message: msg });
    }
  }
}

export const recoveryController = new RecoveryController();
