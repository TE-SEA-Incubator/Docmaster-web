import { Request, Response } from 'express';
import { getClient, query } from '../database/db.ts';
import { v4 as uuidv4 } from 'uuid';
import { subscriptionService } from '../services/subscription.service.ts';
import { notificationService } from '../services/notification.service.ts';
import { nokashService } from '../services/nokash.service.ts';
import { getSharePayService } from '../services/sharepay.service.ts';
import { getPaymentProvider } from '../config/features.ts';
import {
  resolveLostFoundPair,
  assertOwnerCanPayRecovery,
  acquireRecoveryReservation,
  releaseRecoveryReservation,
  attachTransactionToReservation,
  markReservationPaid,
  releaseReservationByTransaction,
} from '../utils/recovery.utils.ts';
import { bumpCacheVersion } from '../cache/cache.ts';
import { PUBLIC_SEARCH_VERSION } from '../cache/keys.ts';

const NOKASH_POLL_INTERVAL_MS = 5000;
const NOKASH_POLL_TIMEOUT_MS = 5 * 60 * 1000;
const nokashPollTimers = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Handle Nokash Payment Callback
 * Body format: { id, status, amount, phone, orderId }
 */
export const nokashCallback = async (req: Request, res: Response) => {
  console.log('Nokash Callback Received:', req.body);

  const webhookSecret = process.env.NOKASH_WEBHOOK_SECRET;
  if (webhookSecret) {
    const provided =
      (req.headers['x-nokash-secret'] as string | undefined) ||
      (req.headers['x-webhook-secret'] as string | undefined) ||
      (req.body?.webhook_secret as string | undefined);
    if (provided !== webhookSecret) {
      console.warn('[Nokash Callback] Rejected: invalid webhook secret');
      return res.status(401).json({ success: false, message: 'Unauthorized callback' });
    }
  }
  
  const { id, status, orderId } = req.body;

  try {
    // 1. Find the transaction
    const transRes = await query('SELECT * FROM transactions WHERE external_ref = $1', [id]);
    if (transRes.rows.length === 0) {
      console.warn(`Transaction not found for Nokash ID: ${id}`);
      return res.status(404).json({ success: false, message: 'Transaction non trouvée' });
    }

    const transaction = transRes.rows[0];

    const normalized = normalizeNokashStatus({ status });

    if (transaction.status === 'SUCCESS' && normalized.success) {
      return res.status(200).json({ success: true, message: 'Transaction déjà traitée' });
    }

    // 2. Normalize status (accept SUCCESS, SUCCEEDED, SUCCESSFUL, PAID, COMPLETED, etc.)

    if (normalized.success && transaction.status === 'PENDING') {
      let metadata = transaction.metadata;
      
      // Safety parse if string (some DB adapters return JSONB as string)
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch(e) { 
          console.error('Metadata parse error:', e);
        }
      }

      const locked = await query(
        'UPDATE transactions SET status = $1 WHERE id = $2 AND status = $3 RETURNING *',
        ['SUCCESS', transaction.id, 'PENDING']
      );
      if (locked.rows.length === 0) {
        return res.status(200).json({ success: true, message: 'Transaction déjà traitée' });
      }

      // Handle based on transaction type
      if (transaction.type === 'subscription') {
        const { planId, months } = metadata || {};
        await subscriptionService.activateSubscription(transaction.user_id, planId, months);
        console.log(`Subscription activated for user ${transaction.user_id} via Nokash ${id}`);
      } 
      else if (transaction.type === 'recovery_fee') {
        const { docId, matchId, foundId, reservationId } = metadata || {};
        try {
          await activateRecovery(transaction.user_id, docId, transaction.id, {
            matchId,
            foundId,
            reservationId,
          });
          console.log(`Recovery activated for doc ${docId} via Nokash ${id}`);
        } catch (activationErr) {
          // Put the transaction back to PENDING so the callback/reconciliation can
          // retry instead of leaving a paid transaction without a claim.
          await revertRecoveryTransactionForRetry(transaction.id);
          throw activationErr;
        }
      }
      else if (transaction.type === 'points_purchase') {
        const { pointsAmount } = metadata || {};
        if (pointsAmount) {
          await query(
            `UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2`,
            [pointsAmount, transaction.user_id]
          );
          await query(
            `INSERT INTO earnings_history (user_id, type, amount, currency, description, metadata)
             VALUES ($1, 'POINTS_PURCHASE', $2, 'POINTS', $3, $4)`,
            [transaction.user_id, pointsAmount, `Achat de ${pointsAmount} points`, JSON.stringify({ transactionId: transaction.id, provider: 'NOKASH' })]
          );
          console.log(`Points credited: ${pointsAmount} to user ${transaction.user_id} via Nokash ${id}`);
        }
      }

      // Notify Admins
      await notificationService.notifyAdmins(
        'Nouveau Paiement Reçu',
        `Un paiement de ${transaction.amount} ${transaction.currency} a été effectué avec succès (Réf: ${id}, Type: ${transaction.type}).`,
        'INFO'
      );
    } else if (normalized.terminal && !normalized.success) {
      const terminalStatus = normalized.status === 'CANCELLED' ? 'CANCELED' : normalized.status;
      await query('UPDATE transactions SET status = $1 WHERE id = $2', [terminalStatus, transaction.id]);
      await releaseReservationByTransaction(transaction.id);
      
      // Notify user of failure
      await notificationService.createNotification({
        user_id: transaction.user_id,
        type: 'PAYMENT_FAILED',
        title: 'Échec du Paiement',
        message: `Le paiement (${transaction.type}) a échoué ou a été annulé.`,
        metadata: { nokashId: id }
      });
    }

    // Always respond 200 to Nokash
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Nokash Callback Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get current user's transactions
 */
export const getMyTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    const result = await query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.status(200).json({ 
      success: true, 
      transactions: result.rows,
      data: result.rows
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * Get all transactions (Admin)
 */
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT t.*, u.nom, u.prenom, u.email, CONCAT(u.prenom, ' ', u.nom) as user_name FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC`
    );

    res.status(200).json({ 
      success: true, 
      transactions: result.rows 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Process payment for document recovery
 * POST /api/payments/pay-recovery
 */
export const payRecovery = async (req: Request, res: Response) => {
    const { docId, amount, paymentMethod, matchId } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
    }

    let reservationId: string | null = null;
    let keepReservation = false;
    let pointsRedeemed = 0;
    let activationCompleted = false;
    let pointsRefundContext: { docId: string; matchId?: string | null; foundId?: string | null } | null = null;

    try {
      // Points payment bypasses Nokash entirely — skip method availability check
      if (paymentMethod !== 'POINTS') {
        const enabledMethodsEnv = process.env.NOKASH_ENABLED_METHODS || '';
        const enabledMethodsRaw = enabledMethodsEnv.split(',').map(m => m.trim()).filter(Boolean);
        if (enabledMethodsRaw.length > 0) {
          const mapToCanonical = (m?: string) => {
            if (!m) return '';
            const u = m.toString().toUpperCase();
            if (u === 'ORANGE_MONEY' || u === 'OM') return 'OM';
            if (u === 'MTN_MOMO' || u === 'MOMO') return 'MOMO';
            return u;
          };

          const enabledCanonical = enabledMethodsRaw.map(mapToCanonical);
          const requestedCanonical = mapToCanonical(paymentMethod);
          if (!enabledCanonical.includes(requestedCanonical)) {
            console.warn('[PayRecovery] Payment method not enabled:', requestedCanonical, 'enabled:', enabledCanonical);
            return res.status(400).json({ success: false, message: `La méthode de paiement '${paymentMethod}' n'est pas configurée pour cette application.` });
          }
        }
      }

        // 1. Resolve exact match + verify owner + explicit confirmation
        const pair = await assertOwnerCanPayRecovery(userId, docId, matchId || null);
        const lostId = pair.lostId;
        const foundId = pair.foundId;
        const declaration = pair.lostDecl;

        /**
         * Already paid:
         * - same owner -> return the existing code (idempotent retry/refresh)
         * - another owner -> the FOUND is gone, never create a second claim
         */
        const paidClaimRes = await query(
          `SELECT * FROM claims
           WHERE status IN ('PAID', 'VALIDATED')
             AND (doc_id = $1 OR found_declaration_id = $2)
           ORDER BY created_at DESC LIMIT 1`,
          [lostId, foundId]
        );
        if (paidClaimRes.rows.length > 0) {
          const claim = paidClaimRes.rows[0];
          if (claim.owner_id !== userId || (claim.found_declaration_id && claim.found_declaration_id !== foundId)) {
            return res.status(409).json({
              success: false,
              message: 'Ce document a déjà été récupéré par un autre propriétaire.',
            });
          }
          return res.status(200).json({
            success: true,
            message: 'Paiement déjà effectué pour ce document.',
            data: { paid: true, verification_code: claim.verification_code, matchId: pair.matchId },
          });
        }

        // 2. Fetch document type to get pricing/commission
        const docTypeRes = await query('SELECT * FROM document_types WHERE code = $1 OR id::text = $1', [declaration.doc_type]);
        const docType = docTypeRes.rows[0];
        const finalAmount = docType ? Number(docType.prix_retrouvaille) : (amount || 5000);

        // 3. Reserve the FOUND before any external call. Unique partial indexes on
        // recovery_reservations make this the single source of truth for the race.
        const reservation = await acquireRecoveryReservation(pair, userId);
        reservationId = reservation.id;

        // 4. Initiate Payment (SharePay or Nokash depending on configuration)
        const orderId = `REC-${uuidv4().substring(0, 8)}`;
        const isPoints = paymentMethod === 'POINTS';
        const provider = getPaymentProvider('USER');
        let externalRef: string | null = null;
        let providerReference: string | null = null;

        if (!isPoints) {
          try {
            if (provider === 'SHAREPAY') {
              const sharepay = getSharePayService();
              const charge = await sharepay.createCharge({
                amount: Math.round(finalAmount),
                currency: 'XAF',
                paymentMethod: mapSharePayMethod(paymentMethod),
                payerAccount: req.body.phone,
                payerName: (req as any).user?.prenom && (req as any).user?.nom
                  ? `${(req as any).user.prenom} ${(req as any).user.nom}`
                  : undefined,
                merchantReference: orderId,
                description: `Frais de récupération DocMaster - ${orderId}`,
                idempotencyKey: orderId,
              });

              console.log('[PayRecovery] SharePay charge', {
                reference: charge.reference,
                status: charge.status,
                amount: charge.amount,
                currency: charge.currency,
              });

              if (charge.status !== 'PENDING' && charge.status !== 'SUCCESS') {
                throw new Error("Le paiement n'a pas pu être initié. Veuillez réessayer.");
              }

              externalRef = charge.reference;
              providerReference = charge.reference;
            } else {
              const nokashRes = await nokashService.initiatePayment({
                payment_method: paymentMethod,
                amount: finalAmount,
                order_id: orderId,
                user_phone: req.body.phone,
                country: 'CM'
              });

              if (nokashRes.status !== 'REQUEST_OK') {
                const nokashMsg = (nokashRes.message || '').toString();
                if (nokashMsg.toLowerCase().includes('intégr') && nokashMsg.toLowerCase().includes('méthode')) {
                  console.warn('[PayRecovery] Nokash method not integrated:', nokashMsg);
                  return res.status(400).json({ success: false, message: `La méthode de paiement demandée n'est pas activée sur votre compte de paiement.` });
                }
                throw new Error(`Nokash: ${nokashMsg || 'Erreur lors de l\'initialisation'}`);
              }

              externalRef = nokashRes.data.id;
              providerReference = nokashRes.data.id;
            }
          } catch (err: any) {
            if (err.status === 400) {
              return res.status(400).json({ success: false, message: err.message });
            }
            const em = (err && err.message) ? err.message.toLowerCase() : '';
            if (em.includes('méthode') && em.includes('nokash')) {
              return res.status(400).json({ success: false, message: 'La méthode de paiement sélectionnée n\'est pas disponible pour votre application Nokash.' });
            }
            console.error(`❌ [PayRecovery] ${provider} call failed:`, err);
            return res.status(502).json({ success: false, message: 'Échec de la communication avec le service de paiement externe.' });
          }
        } else {
          const { pointsService } = await import('../services/points.service.ts');
          const pointsNeeded = await pointsService.calculatePointsNeeded(finalAmount);
          await pointsService.redeemPoints(userId, pointsNeeded, 'POINTS_REDEMPTION', `Paiement récupération doc ${lostId}`, {
            docId: lostId,
            matchId: pair.matchId,
            foundId,
          });
          pointsRedeemed = pointsNeeded;
          pointsRefundContext = { docId: lostId, matchId: pair.matchId, foundId };
        }

        // 5. Create PENDING transaction (or SUCCESS if points)
        const transactionStatus = isPoints ? 'SUCCESS' : 'PENDING';
        const txInsert = await query(
            `INSERT INTO transactions (user_id, amount, currency, status, payment_method, type, external_ref, metadata) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [
                userId, 
                finalAmount, 
                isPoints ? 'POINTS' : 'XAF', 
                transactionStatus, 
                paymentMethod,
                'recovery_fee', 
                isPoints ? orderId : externalRef,
                JSON.stringify({
                  docId: lostId,
                  matchId: pair.matchId,
                  foundId,
                  reservationId: reservation.id,
                  orderId,
                  provider: isPoints ? 'POINTS' : provider,
                  provider_reference: providerReference,
                })
            ]
        );
        const recoveryTxId = txInsert.rows[0].id;
        await attachTransactionToReservation(reservation.id, recoveryTxId);

        if (isPoints) {
          try {
            await activateRecovery(userId, lostId, recoveryTxId, {
              matchId: pair.matchId,
              foundId,
              reservationId: reservation.id,
            });
            activationCompleted = true;
          } catch (activationErr) {
            await query(
              "UPDATE transactions SET status = 'FAILED' WHERE id = $1 AND status = 'SUCCESS'",
              [recoveryTxId],
            );
            throw activationErr;
          }
          keepReservation = true;
          const claimRow = await query(
            'SELECT verification_code FROM claims WHERE doc_id = $1 AND owner_id = $2 AND status IN ($3, $4) ORDER BY created_at DESC LIMIT 1',
            [lostId, userId, 'PAID', 'VALIDATED']
          );
          const verificationCode = claimRow.rows[0]?.verification_code ?? null;
          return res.status(200).json({
            success: true,
            message: 'Paiement par points réussi.',
            data: { paid: true, verification_code: verificationCode, matchId: pair.matchId }
          });
        }

        startNokashPaymentPolling({
          externalRef: externalRef!,
          onSuccess: async (transaction) => {
            const metadata = typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata;
            await activateRecovery(transaction.user_id, metadata.docId, transaction.id, {
              matchId: metadata.matchId,
              foundId: metadata.foundId,
              reservationId: metadata.reservationId,
            });
          }
        });

        keepReservation = true;
        res.status(200).json({
            success: true,
            message: provider === 'SHAREPAY'
              ? 'Paiement SharePay initié. Validez sur votre téléphone.'
              : 'Paiement initié. Veuillez valider sur votre téléphone.',
            data: {
                transactionId: externalRef,
                nokashId: provider === 'NOKASH' ? externalRef : undefined,
                provider,
                orderId,
                matchId: pair.matchId,
            }
        });
    } catch (error: any) {
        console.error('❌ [PayRecovery] Error:', error);
        if (pointsRedeemed > 0 && !activationCompleted) {
          try {
            const { pointsService } = await import('../services/points.service.ts');
            await pointsService.refundPoints(
              userId,
              pointsRedeemed,
              `Remboursement du paiement de récupération du document ${pointsRefundContext?.docId}`,
              { ...pointsRefundContext, reason: 'RECOVERY_ACTIVATION_FAILED' },
            );
          } catch (refundErr) {
            console.error('[PayRecovery] Points refund failed:', refundErr);
          }
        }
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Erreur interne du serveur lors du paiement.' });
    } finally {
        if (reservationId && !keepReservation) {
          try {
            await releaseRecoveryReservation(reservationId, 'CANCELLED');
          } catch (releaseErr) {
            console.error('[PayRecovery] Failed to release reservation:', releaseErr);
          }
        }
    }
};

/**
 * Helper to activate recovery after successful payment
 */
export async function activateRecovery(
    userId: string,
    docId: string,
    transactionId: string,
    context: {
      matchId?: string | null;
      foundId?: string | null;
      reservationId?: string | null;
    } = {},
) {
    const pair = await resolveLostFoundPair(docId, context.matchId || null);
    if (!pair || !pair.lostId || !pair.foundId || !pair.matchId) {
      throw new Error(`[activateRecovery] Cannot resolve an active match for ${docId}`);
    }

    const lostId = pair.lostId;
    const foundId = pair.foundId;
    const matchId = pair.matchId;

    const client = await getClient();
    let claimId: string;
    let verificationCode: string;
    let finderId: string | null = null;
    let lostDecl: any;
    let foundDecl: any;
    let docTypeName = docId;
    let already = false;
    const loserLostIds: string[] = [];

    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [foundId]);

      const matchRes = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
      const match = matchRes.rows[0];
      if (!match || match.status !== 'CONFIRMED' || !match.owner_confirmed_at) {
        throw new Error('Cette correspondance doit être confirmée avant le paiement.');
      }
      if (match.lost_declaration_id !== lostId || match.found_declaration_id !== foundId) {
        throw new Error('Correspondance incohérente.');
      }

      const declRes = await client.query(
        'SELECT * FROM declarations WHERE id = ANY($1::uuid[]) FOR UPDATE',
        [[lostId, foundId]],
      );
      lostDecl = declRes.rows.find((d: any) => d.id === lostId);
      foundDecl = declRes.rows.find((d: any) => d.id === foundId);
      if (!lostDecl || !foundDecl) throw new Error('Déclaration introuvable.');
      if (lostDecl.reporter_id !== userId) {
        throw new Error('Action non autorisée — seul le propriétaire peut activer la récupération.');
      }
      if (foundDecl.reporter_id && foundDecl.reporter_id === userId) {
        throw new Error('Vous ne pouvez pas activer la récupération d\'un document que vous avez vous-même déclaré trouvé.');
      }

      let payment: { id: string; amount: number } | null = null;
      if (transactionId) {
        const txRes = await client.query(
          `SELECT id, amount, status FROM transactions
           WHERE id::text = $1 OR external_ref = $1
           ORDER BY created_at DESC LIMIT 1`,
          [transactionId],
        );
        const tx = txRes.rows[0];
        if (!tx || tx.status !== 'SUCCESS') {
          throw new Error('Paiement non confirmé.');
        }
        payment = { id: tx.id, amount: Number(tx.amount) };
      }

      // A claim already attached to this FOUND is final. A retry by the same owner is
      // idempotent; a retry by another owner must never create a second winner.
      const existingRes = await client.query(
        `SELECT * FROM claims
         WHERE status IN ('PAID', 'VALIDATED')
           AND (doc_id = $1 OR found_declaration_id = $2)
         ORDER BY created_at DESC LIMIT 1
         FOR UPDATE`,
        [lostId, foundId],
      );
      const existing = existingRes.rows[0];
      if (existing) {
        if (
          existing.owner_id !== userId ||
          existing.doc_id !== lostId ||
          (existing.found_declaration_id && existing.found_declaration_id !== foundId)
        ) {
          throw new Error('Ce document a déjà été récupéré par un autre propriétaire.');
        }
        claimId = existing.id;
        verificationCode = existing.verification_code;
        finderId = foundDecl.reporter_id || existing.finder_id || null;
        already = true;
        if (!existing.found_declaration_id) {
          await client.query(
            'UPDATE claims SET found_declaration_id = $2 WHERE id = $1',
            [claimId, foundId],
          );
        }
      } else {
        const reservationRes = await client.query(
          `SELECT * FROM recovery_reservations
           WHERE found_declaration_id = $1
             AND status IN ('RESERVED', 'PAID')
           FOR UPDATE`,
          [foundId],
        );
        const reservation = reservationRes.rows[0];
        if (reservation && reservation.owner_id && reservation.owner_id !== userId) {
          throw new Error('Ce document est déjà en cours de traitement par un autre propriétaire.');
        }
        if (context.reservationId && reservation && reservation.id !== context.reservationId) {
          throw new Error('Réservation de récupération incohérente.');
        }

        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        finderId = foundDecl.reporter_id || null;

        const oldClaimRes = await client.query(
          `SELECT * FROM claims
           WHERE doc_id = $1 AND owner_id = $2
           ORDER BY created_at DESC LIMIT 1
           FOR UPDATE`,
          [lostId, userId],
        );
        const oldClaim = oldClaimRes.rows[0];
        if (oldClaim) {
          claimId = oldClaim.id;
          await client.query(
            `UPDATE claims
             SET status = 'PAID',
                 found_declaration_id = $2,
                 verification_code = $3,
                 finder_id = $4,
                 amount = $5,
                 transaction_id = $6
             WHERE id = $1`,
            [claimId, foundId, verificationCode, finderId, payment?.amount ?? null, payment?.id ?? null],
          );
        } else {
          const inserted = await client.query(
            `INSERT INTO claims
               (doc_id, found_declaration_id, owner_id, finder_id, verification_code, status, amount, transaction_id)
             VALUES ($1, $2, $3, $4, $5, 'PAID', $6, $7)
             RETURNING id`,
            [lostId, foundId, userId, finderId, verificationCode, payment?.amount ?? null, payment?.id ?? null],
          );
          claimId = inserted.rows[0].id;
        }

        if (reservation) {
          await client.query(
            `UPDATE recovery_reservations
             SET status = 'PAID', transaction_id = COALESCE($2, transaction_id), updated_at = NOW()
             WHERE id = $1`,
            [reservation.id, payment?.id ?? null],
          );
        } else {
          await client.query(
            `INSERT INTO recovery_reservations
               (match_id, lost_declaration_id, found_declaration_id, owner_id, transaction_id, status, expires_at)
             VALUES ($1, $2, $3, $4, $5, 'PAID', NOW())`,
            [matchId, lostId, foundId, userId, payment?.id ?? null],
          );
        }
      }

      await client.query(
        `UPDATE declarations
         SET payment_status = 'PAID', status = 'MATCHED'
         WHERE id = $1`,
        [lostId],
      );
      await client.query(
        `UPDATE declarations
         SET status = 'MATCHED'
         WHERE id = $1
           AND status NOT IN ('RETURNED', 'CANCELLED', 'CLAIMED')`,
        [foundId],
      );

      // One winner: close every other candidate and tell their owners.
      const losersRes = await client.query(
        `UPDATE matches
         SET status = 'REJECTED',
             closed_reason = 'ALREADY_CLAIMED',
             closed_at = NOW(),
             updated_at = NOW()
         WHERE found_declaration_id = $1
           AND id <> $2
           AND status IN ('PENDING', 'CONFIRMED')
         RETURNING lost_declaration_id`,
        [foundId, matchId],
      );
      loserLostIds.push(...losersRes.rows.map((r: any) => r.lost_declaration_id));

      if (loserLostIds.length > 0) {
        await client.query(
          `UPDATE declarations d
           SET status = CASE
             WHEN EXISTS (
               SELECT 1 FROM matches m
               WHERE m.lost_declaration_id = d.id
                 AND m.status IN ('PENDING', 'CONFIRMED')
             ) THEN 'MATCHED' ELSE 'SEARCHING'
           END
           WHERE d.id = ANY($1::uuid[])
             AND d.status NOT IN ('RESERVED', 'CLAIMED', 'RETURNED', 'CANCELLED')`,
          [loserLostIds],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore
      }
      throw err;
    } finally {
      client.release();
    }

    try {
      const docTypeRes = await query(
        'SELECT * FROM document_types WHERE code = $1 OR id::text = $1',
        [lostDecl.doc_type],
      );
      docTypeName = docTypeRes.rows[0]?.nom || lostDecl.doc_type;
    } catch (docTypeErr) {
      console.error('[activateRecovery] Doc type lookup failed:', docTypeErr);
      docTypeName = lostDecl.doc_type;
    }

    try {
      await bumpCacheVersion(PUBLIC_SEARCH_VERSION);
    } catch (cacheErr) {
      console.error('[activateRecovery] Cache bump failed:', cacheErr);
    }

    if (!already) {
      try {
        const { activityLogService } = await import('../services/activity-log.service.ts');
        activityLogService.log({
          user_id: userId,
          action_type: 'RECOVERY_PAYMENT',
          entity_type: 'declaration',
          entity_id: lostId,
          description: `Paiement des frais de récupération pour le document ${lostId}`,
          metadata: { docId: lostId, foundId, matchId, finderId, verificationCode, transactionId },
        });
      } catch (logErr) {
        console.error('[activateRecovery] Activity log failed:', logErr);
      }

      if (finderId) {
        try {
          const isPartner = foundDecl.reporter_type === 'PARTENAIRE';
          await notificationService.createNotification({
            ...(isPartner ? {} : { user_id: finderId }),
            destinataire_type: isPartner ? 'PARTENAIRE' : 'USER',
            destinataire_id: finderId,
            type: 'PAYMENT_PENDING',
            title: 'Paiement effectué par le propriétaire',
            message: `Le propriétaire a payé les frais. Validez le code lors de la remise pour recevoir votre récompense.`,
            metadata: { docId: lostId, foundId, matchId, action: 'RECOVERY_PAID' },
          });
        } catch (notifyErr) {
          console.error('[activateRecovery] Finder notification failed:', notifyErr);
        }
      }
    }

    for (const loserLostId of new Set(loserLostIds)) {
      if (loserLostId === lostId) continue;
      try {
        const loserRes = await query('SELECT reporter_id FROM declarations WHERE id = $1', [loserLostId]);
        const loserOwner = loserRes.rows[0]?.reporter_id;
        if (loserOwner) {
          await notificationService.notifyMatchClosed(
            loserOwner,
            docTypeName,
            foundId,
            matchId,
          );
        }
      } catch (notifyErr) {
        console.error('[activateRecovery] Loser notification failed:', notifyErr);
      }
    }

    try {
      const { messagingService } = await import('../services/messaging.service.ts');
      await messagingService.openConversationForPair({
        claimId,
        lostDeclaration: { ...lostDecl, id: lostId },
        foundDeclaration: foundDecl ? { ...foundDecl, id: foundId } : null,
      });
    } catch (conversationErr) {
      console.error('[activateRecovery] Échec d’ouverture de la conversation:', conversationErr);
    }

    return { claimId, verificationCode, foundId, matchId, already };
}

async function revertRecoveryTransactionForRetry(transactionId: string) {
  try {
    await query(
      `UPDATE transactions
       SET status = 'PENDING'
       WHERE id = $1 AND status = 'SUCCESS' AND type = 'recovery_fee'`,
      [transactionId],
    );
  } catch (err) {
    console.error('[Recovery] Failed to revert transaction for retry:', transactionId, err);
  }
}

function mapSharePayMethod(method?: string): 'ORANGE_MONEY_CM' | 'MTN_MOMO_CM' {
  const normalized = (method || '').toString().toUpperCase();
  if (normalized.includes('ORANGE') || normalized === 'OM') return 'ORANGE_MONEY_CM';
  return 'MTN_MOMO_CM';
}

function normalizeNokashStatus(payload: any) {
  const status = (payload?.status || payload?.data?.status || payload?.result?.status || '').toString().toUpperCase();
  return {
    status,
    success: ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'COMPLETED'].includes(status),
    terminal: ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'COMPLETED', 'FAILED', 'CANCELED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(status),
  };
}

export function startNokashPaymentPolling(params: {
  externalRef: string;
  onSuccess: (transaction: any) => Promise<void>;
}) {
  const { externalRef, onSuccess } = params;

  stopNokashPolling(externalRef);

  const startedAt = Date.now();

  const timer = setInterval(async () => {
    try {
      if (Date.now() - startedAt > NOKASH_POLL_TIMEOUT_MS) {
        console.warn(`[Nokash Poll] Timeout reached for ${externalRef}`);
        stopNokashPolling(externalRef);
        return;
      }

      const transactionRes = await query(
        'SELECT id, status, user_id, metadata FROM transactions WHERE external_ref = $1 LIMIT 1',
        [externalRef]
      );

      if (transactionRes.rows.length === 0) {
        stopNokashPolling(externalRef);
        return;
      }

      const transaction = transactionRes.rows[0];
      if (transaction.status === 'SUCCESS' || transaction.status === 'FAILED' || transaction.status === 'CANCELED') {
        stopNokashPolling(externalRef);
        return;
      }

      const metadata = typeof transaction.metadata === 'string'
        ? JSON.parse(transaction.metadata || '{}')
        : (transaction.metadata || {});
      const isSharePay = metadata.provider === 'SHAREPAY';

      const statusRes = isSharePay
        ? await getSharePayService().getPayInStatus(externalRef)
        : await nokashService.checkStatus(externalRef);
      const normalized = normalizeNokashStatus(statusRes);

      if (!normalized.status) {
        return;
      }

      console.log(`[${isSharePay ? 'SharePay' : 'Nokash'} Poll] ${externalRef} -> ${normalized.status}`);

      if (normalized.success) {
        const locked = await query(
          'UPDATE transactions SET status = $1 WHERE id = $2 AND status = $3 RETURNING *',
          ['SUCCESS', transaction.id, 'PENDING']
        );
        if (locked.rows.length === 0) {
          stopNokashPolling(externalRef);
          return;
        }
        try {
          await onSuccess(transaction);
          stopNokashPolling(externalRef);
        } catch (activationErr) {
          await revertRecoveryTransactionForRetry(transaction.id);
          console.error(`[Nokash Poll] Activation failed for ${externalRef}, will retry:`, activationErr);
        }
        return;
      }

      if (normalized.terminal) {
        const terminalStatus = normalized.status === 'CANCELLED' ? 'CANCELED' : normalized.status;
        await query('UPDATE transactions SET status = $1 WHERE id = $2', [terminalStatus, transaction.id]);
        await releaseReservationByTransaction(transaction.id);
        stopNokashPolling(externalRef);
      }
    } catch (error) {
      console.error(`[Nokash Poll] Error for ${externalRef}:`, error);
    }
  }, NOKASH_POLL_INTERVAL_MS);

  nokashPollTimers.set(externalRef, timer);
}

export function stopNokashPolling(externalRef: string) {
    const timer = nokashPollTimers.get(externalRef);
    if (timer) {
      clearInterval(timer);
      nokashPollTimers.delete(externalRef);
    }
}

/**
 * Force check a transaction status with Nokash (manual reconciliation)
 * GET /api/payments/check/:externalRef
 * Accessible by the transaction owner or admin
 */
export const forceCheckTransaction = async (req: Request, res: Response) => {
  try {
    const externalRef = req.params.externalRef as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    const transRes = await query('SELECT * FROM transactions WHERE external_ref = $1 LIMIT 1', [externalRef]);

    if (transRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction non trouvée' });
    }

    const transaction = transRes.rows[0];

    // Check ownership (user can check own, admin can check all)
    if (transaction.user_id !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(200).json({
        success: true,
        data: {
          found: true,
          updated: false,
          reason: `Transaction déjà en statut ${transaction.status}`,
          currentStatus: transaction.status
        }
      });
    }

    const { paymentReconciliationService } = await import('../services/payment-reconciliation.service.ts');
    const result = await paymentReconciliationService.forceCheckTransaction(externalRef);

    if (result.updated) {
      return res.status(200).json({
        success: true,
        data: {
          found: true,
          updated: true,
          status: result.status,
          message: `Transaction mise à jour : ${result.status}`
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        found: true,
        updated: false,
        reason: result.reason || 'En attente de confirmation du fournisseur de paiement',
        currentStatus: 'PENDING'
      }
    });
  } catch (error: any) {
    console.error('Force check error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
