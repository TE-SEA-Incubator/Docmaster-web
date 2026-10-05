import { Request, Response } from 'express';
import { ClaimRepository } from '../repositories/claim.repository.ts';
import { validateRecoveryCode } from '../services/recovery-validation.service.ts';

const claimRepo = new ClaimRepository();

export class ClaimController {
  /**
   * Validate the recovery code provided by the finder
   * POST /api/claims/validate
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
          message: 'Document ID and verification code are required',
        });
      }

      const result = await validateRecoveryCode(docId, userId, code);
      return res.json(result);
    } catch (error: any) {
      const msg = error.message || 'Internal server error during code validation';
      const status =
        msg.includes('non autorisé') || msg.includes('trouveur') ? 403 :
        msg.includes('Trop de tentatives') ? 403 :
        msg.includes('payée') || msg.includes('Aucune') ? 404 :
        msg.includes('invalide') ? 401 : 400;
      return res.status(status).json({ success: false, message: msg });
    }
  }

  /**
   * Create a new claim manually — admin only
   * POST /api/claims/create
   */
  async createClaim(req: Request, res: Response) {
    try {
      const userRole = (req as any).user?.role?.toUpperCase();
      if (userRole !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
      }

      const { docId, ownerId, finderId } = req.body;

      if (!docId || !ownerId || !finderId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID, owner ID, and finder ID are required',
        });
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const claim = await claimRepo.create({
        doc_id: docId,
        owner_id: ownerId,
        finder_id: finderId,
        verification_code: verificationCode,
        status: 'PAID',
      });

      return res.json({
        success: true,
        message: 'Claim created successfully',
        claim: {
          id: claim.id,
          doc_id: claim.doc_id,
          owner_id: claim.owner_id,
          finder_id: claim.finder_id,
          status: claim.status,
          created_at: claim.created_at,
        },
      });
    } catch (error: any) {
      console.error('Error in createClaim:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating claim',
        error: error.message,
      });
    }
  }

  /**
   * Get active claim for a document (for UI display)
   */
  async getActiveClaim(req: Request, res: Response) {
    try {
      const { docId } = req.params;
      const docIdStr = Array.isArray(docId) ? docId[0] : docId;
      const claim = await claimRepo.findPaidByDocId(docIdStr);

      if (!claim) {
        return res.status(404).json({
          success: false,
          message: 'No paid claim found',
        });
      }

      const { verification_code, ...safeClaim } = claim;

      return res.json({
        success: true,
        claim: safeClaim,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
