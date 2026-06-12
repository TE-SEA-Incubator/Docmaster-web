import { Request, Response } from 'express';
import { ClaimRepository } from '../repositories/claim.repository.ts';
import { DeclarationRepository } from '../repositories/declaration.repository.ts';
import { NotificationService } from '../services/notification.service.ts';
import { MatchRepository } from '../repositories/match.repository.ts';
import { UserRepository } from '../repositories/auth.repository.ts';
import { DocumentTypeRepository } from '../repositories/document-type.repository.ts';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/db.ts';

const claimRepo = new ClaimRepository();
const declRepo = new DeclarationRepository();
const notifService = new NotificationService();
const matchRepo = new MatchRepository();
const userRepo = new UserRepository();
const docTypeRepo = new DocumentTypeRepository();

export class ClaimController {
  /**
   * Validate the recovery code provided by the finder
   * POST /api/claims/validate
   */
  async validateCode(req: Request, res: Response) {
    try {
      const { docId, code } = req.body;
      console.log(`🔍 [Claim] Validating code for docId: ${docId}, code: ${code}`);

      if (!docId || !code) {
        return res.status(400).json({
          success: false,
          message: 'Document ID and verification code are required'
        });
      }

      // 1. Find the active claim for this document
      let claim = await claimRepo.findActiveByDocId(docId);
      console.log(`🔎 [Claim] findActiveByDocId result:`, claim ? `Found claim ID ${claim.id} (Status: ${claim.status})` : 'NULL');

      // If no claim found directly, check if docId is part of a match with an active claim
      // This is crucial because finders use their FOUND declaration ID, while claims are often linked to the LOST ID
      if (!claim) {
        console.log(`🔎 [Claim] No direct claim for ${docId}, checking matched counterparts...`);
        const matches = await matchRepo.findByDeclarationId(docId);
        
        if (matches && matches.length > 0) {
          for (const match of matches) {
            const counterpartId = match.lost_declaration_id === docId ? match.found_declaration_id : match.lost_declaration_id;
            const potentialClaim = await claimRepo.findActiveByDocId(counterpartId);
            
            if (potentialClaim) {
              claim = potentialClaim;
              console.log(`✅ [Claim] Found active claim ${claim.id} via counterpart ${counterpartId}`);
              break;
            }
          }
        }
      }

      if (!claim) {
        return res.status(404).json({
          success: false,
          message: 'No active claim found for this document. It may have already been validated or doesn\'t exist.'
        });
      }

      // 2. Check attempts limit (e.g., 5 attempts)
      if (claim.attempts >= 5) {
        return res.status(403).json({
          success: false,
          message: 'Too many failed attempts. This claim is locked for security. Please contact support.'
        });
      }

      // 3. Verify the code
      if (claim.verification_code !== code) {
        const newAttempts = await claimRepo.incrementAttempts(claim.id);
        return res.status(401).json({
          success: false,
          message: 'Invalid verification code',
          attemptsRemaining: 5 - newAttempts
        });
      }

      // 4. Code is valid! Update claim and declaration status
      await claimRepo.updateStatus(claim.id, 'VALIDATED');
      
      // Update the declarations associated with this claim
      // The claim is linked to one side (usually the LOST one), but we must update both
      const claimDocId = claim.doc_id;
      const updatedDecl = await declRepo.updateStatus(claimDocId, 'RETURNED');
      
      // Find the counterpart in the match and update it too
      const matches = await matchRepo.findByDeclarationId(claimDocId);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const otherId = match.lost_declaration_id === claimDocId ? match.found_declaration_id : match.lost_declaration_id;
          await declRepo.updateStatus(otherId, 'RETURNED');
          console.log(`✅ [Claim] Marked counterpart declaration ${otherId} as RETURNED`);
        }
      }

      // 5. Identify the LOST declaration for notifications and rewards
      // If the declaration linked to the claim isn't LOST, we try to find the LOST one in the match
      let lostDecl = updatedDecl?.declaration_type === 'LOST' ? updatedDecl : null;
      if (!lostDecl && matches && matches.length > 0) {
        for (const match of matches) {
          const otherId = match.lost_declaration_id === claimDocId ? match.found_declaration_id : match.lost_declaration_id;
          const otherDecl = await declRepo.findById(otherId);
          if (otherDecl?.declaration_type === 'LOST') {
            lostDecl = otherDecl;
            break;
          }
        }
      }

      // 6. Notify the owner and credit reward to finder
      if (lostDecl) {
        await notifService.notifyDocumentRecovered(
          claim.owner_id,
          lostDecl.doc_type,
          lostDecl.id
        );

        // Calculate and credit reward to finder (XAF and Points)
        // Fetch document type to get commission details
        const docType = await docTypeRepo.findById(lostDecl.doc_type);
        
        if (docType && claim.finder_id) {
          const basePrice = Number(docType.prix_retrouvaille) || 5000;
          const finderPercent = Number(docType.finder_percent) || 80;
          const pointsReward = Number(docType.points_recompense) || 20;
          
          const finderRewardAmount = (basePrice * finderPercent) / 100;

          // 1. Credit wallet
          await userRepo.updateBalance(claim.finder_id, finderRewardAmount);
          
          // 2. Create transaction record (payout)
          await query(
            `INSERT INTO transactions (id, user_id, amount, currency, status, payment_method, type, metadata) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              claim.finder_id,
              finderRewardAmount,
              'XAF',
              'SUCCESS',
              'VIRTUAL_WALLET',
              'finder_payout',
              JSON.stringify({ 
                docId: lostDecl.id, 
                claimId: claim.id,
                note: `Récompense pour remise de ${docType.nom}`
              })
            ]
          );

          // 3. Award points
          await userRepo.updatePoints(claim.finder_id, pointsReward);

          // 4. Record earnings history + send notifications
          const { EarningsService } = await import('../services/earnings.service.ts');
          await new EarningsService().recordReturnPoints(
            claim.finder_id,
            pointsReward,
            finderRewardAmount,
            { docId: lostDecl.id, claimId: claim.id, docType: docType.nom }
          );
          
          console.log(`💰 [Claim] Finder ${claim.finder_id} rewarded with ${finderRewardAmount} XAF and ${pointsReward} pts after validation.`);
        }
      }

      return res.json({
        success: true,
        message: 'Code validé avec succès ! Le document a été officiellement remis.',
        claimId: claim.id
      });

    } catch (error: any) {
      console.error('Error in validateCode:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during code validation',
        error: error.message
      });
    }
  }

  /**
   * Create a new claim manually
   * POST /api/claims/create
   */
  async createClaim(req: Request, res: Response) {
    try {
      const { docId, ownerId, finderId } = req.body;
      const userId = (req as any).user?.id;

      if (!docId || !ownerId || !finderId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID, owner ID, and finder ID are required'
        });
      }

      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const claim = await claimRepo.create({
        doc_id: docId,
        owner_id: ownerId,
        finder_id: finderId,
        verification_code: verificationCode,
        status: 'PENDING'
      });

      console.log(`🔐 [Claim] Manual claim created for document ${docId} with code ${verificationCode}`);

      return res.json({
        success: true,
        message: 'Claim created successfully',
        claim: {
          id: claim.id,
          doc_id: claim.doc_id,
          owner_id: claim.owner_id,
          finder_id: claim.finder_id,
          status: claim.status,
          created_at: claim.created_at
          // Note: verification_code not returned for security
        }
      });

    } catch (error: any) {
      console.error('Error in createClaim:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating claim',
        error: error.message
      });
    }
  }

  /**
   * Get active claim for a document (for UI display)
   */
  async getActiveClaim(req: Request, res: Response) {
    try {
      const { docId } = req.params;
      // Ensure docId is a string (not string array)
      const docIdStr = Array.isArray(docId) ? docId[0] : docId;
      const claim = await claimRepo.findActiveByDocId(docIdStr);

      if (!claim) {
        return res.status(404).json({
          success: false,
          message: 'No active claim found'
        });
      }

      // Remove sensitive data before sending to UI
      const { verification_code, ...safeClaim } = claim;

      return res.json({
        success: true,
        claim: safeClaim
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}
