import { Request, Response } from 'express';
import { query } from '../database/db.ts';
import { v4 as uuidv4 } from 'uuid';
import { subscriptionService } from '../services/subscription.service.ts';
import { notificationService } from '../services/notification.service.ts';
import { nokashService } from '../services/nokash.service.ts';
import { resolveLostFoundPair } from '../utils/recovery.utils.ts';

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
        const { docId } = metadata || {};
        await activateRecovery(transaction.user_id, docId, transaction.id);
        console.log(`Recovery activated for doc ${docId} via Nokash ${id}`);
      }
      else if (transaction.type === 'points_purchase') {
        const { pointsAmount } = metadata || {};
        if (pointsAmount) {
          await query(
            `UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2`,
            [pointsAmount, transaction.user_id]
          );
          await query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'credit', $2, $3)`,
            [transaction.user_id, pointsAmount, `Achat de ${pointsAmount} points`]
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
    const { docId, amount, paymentMethod } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
    }

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
        // 1. Resolve LOST declaration and verify ownership
        let pair;
        try {
          const { assertOwnerCanPayRecovery } = await import('../utils/recovery.utils.ts');
          pair = await assertOwnerCanPayRecovery(userId, docId);
        } catch (authErr: any) {
          return res.status(403).json({ success: false, message: authErr.message });
        }

        const lostId = pair.lostId;
        const declaration = pair.lostDecl;

        if (declaration.payment_status === 'PAID') {
            const claimRow = await query(
              'SELECT verification_code FROM claims WHERE doc_id = $1 AND owner_id = $2 AND status = $3 ORDER BY created_at DESC LIMIT 1',
              [lostId, userId, 'PAID']
            );
            return res.status(200).json({
              success: true,
              message: 'Paiement déjà effectué pour ce document.',
              data: { paid: true, verification_code: claimRow.rows[0]?.verification_code ?? null },
            });
        }

        // 2. Fetch document type to get pricing/commission
        const docTypeRes = await query('SELECT * FROM document_types WHERE code = $1 OR id::text = $1', [declaration.doc_type]);
        const docType = docTypeRes.rows[0];
        const finalAmount = docType ? Number(docType.prix_retrouvaille) : (amount || 5000);

        // 3. Initiate Payment
        const orderId = `REC-${uuidv4().substring(0, 8)}`;
        let nokashRes;
        let isPoints = paymentMethod === 'POINTS';

        if (!isPoints) {
          try {
            nokashRes = await nokashService.initiatePayment({
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
          } catch (err: any) {
            if (err.status === 400) {
              return res.status(400).json({ success: false, message: err.message });
            }
            const em = (err && err.message) ? err.message.toLowerCase() : '';
            if (em.includes('méthode') && em.includes('nokash')) {
              return res.status(400).json({ success: false, message: 'La méthode de paiement sélectionnée n\'est pas disponible pour votre application Nokash.' });
            }
            console.error('❌ [PayRecovery] Nokash call failed:', err);
            return res.status(502).json({ success: false, message: 'Échec de la communication avec le service de paiement externe.' });
          }
        } else {
          // If points, validate points balance
          const { pointsService } = await import('../services/points.service.ts');
          const pointsNeeded = await pointsService.calculatePointsNeeded(finalAmount);
          await pointsService.redeemPoints(userId, pointsNeeded, 'POINTS_REDEMPTION', `Paiement récupération doc ${lostId}`, { docId: lostId });
        }

        // 4. Create PENDING transaction (or SUCCESS if points)
        const txInsert = await query(
            `INSERT INTO transactions (user_id, amount, currency, status, payment_method, type, external_ref, metadata) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [
                userId, 
                finalAmount, 
                isPoints ? 'POINTS' : 'XAF', 
                isPoints ? 'SUCCESS' : 'PENDING', 
                paymentMethod,
                'recovery_fee', 
                isPoints ? orderId : nokashRes.data.id,
                JSON.stringify({ docId: lostId })
            ]
        );
        const recoveryTxId = txInsert.rows[0].id;

        if (isPoints) {
          await activateRecovery(userId, lostId, recoveryTxId);
          const claimRow = await query(
            'SELECT verification_code FROM claims WHERE doc_id = $1 AND owner_id = $2 AND status = $3 ORDER BY created_at DESC LIMIT 1',
            [lostId, userId, 'PAID']
          );
          const verificationCode = claimRow.rows[0]?.verification_code ?? null;
          return res.status(200).json({
            success: true,
            message: 'Paiement par points réussi.',
            data: { paid: true, verification_code: verificationCode }
          });
        }

        startNokashPaymentPolling({
          externalRef: nokashRes.data.id,
          onSuccess: async (transaction) => {
            const metadata = typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata;
            await activateRecovery(transaction.user_id, metadata.docId, transaction.id);
          }
        });

        res.status(200).json({
            success: true,
            message: 'Paiement initié. Veuillez valider sur votre téléphone.',
            data: {
                nokashId: nokashRes.data.id,
                orderId
            }
        });
    } catch (error: any) {
        console.error('❌ [PayRecovery] Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Erreur interne du serveur lors du paiement.' });
    }
};

/**
 * Helper to activate recovery after successful payment
 */
export async function activateRecovery(userId: string, docId: string, transactionId: string) {
    try {
        const pair = await resolveLostFoundPair(docId);
        if (!pair) {
          console.warn(`[activateRecovery] Cannot resolve LOST declaration for ${docId}`);
          return;
        }

        const lostId = pair.lostId;
        const declaration = pair.lostDecl;

        if (declaration.reporter_id !== userId) {
          console.warn(`[activateRecovery] User ${userId} is not owner of LOST ${lostId}`);
          return;
        }

        if (declaration.payment_status === 'PAID') {
          console.log(`[activateRecovery] Already paid for doc ${lostId}, skipping`);
          return;
        }

        const docTypeRes = await query('SELECT * FROM document_types WHERE code = $1 OR id::text = $1', [declaration.doc_type]);
        const docType = docTypeRes.rows[0];

        // Le fait d'encaissement est copié sur le claim : la récompense du trouveur se calcule
        // sur ce qui a réellement été payé, pas sur le tarif en vigueur au moment de la validation.
        let payment: { id: string; amount: number } | null = null;
        if (transactionId) {
          const txRes = await query(
            `SELECT id, amount, status FROM transactions
             WHERE id::text = $1 OR external_ref = $1
             ORDER BY created_at DESC LIMIT 1`,
            [transactionId]
          );
          const tx = txRes.rows[0];
          if (tx && tx.status === 'SUCCESS') {
            // transactions.amount est toujours exprimé en XAF, y compris pour un règlement en
            // points : la colonne currency du paiement désigne le moyen, pas l'unité du montant.
            payment = { id: tx.id, amount: Number(tx.amount) };
          } else {
            console.warn(`[activateRecovery] No SUCCESS transaction found for ref ${transactionId}`);
          }
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        let finderId: string | null = null;
        if (pair.foundDecl?.reporter_id) {
          finderId = pair.foundDecl.reporter_id;
        } else {
          const matchRes = await query(
            `SELECT * FROM matches
             WHERE lost_declaration_id = $1 OR found_declaration_id = $1
             ORDER BY created_at DESC LIMIT 1`,
            [lostId]
          );
          if (matchRes.rows.length > 0) {
            const match = matchRes.rows[0];
            const otherId =
              match.lost_declaration_id === lostId ? match.found_declaration_id : match.lost_declaration_id;
            const otherDeclRes = await query('SELECT reporter_id FROM declarations WHERE id = $1', [otherId]);
            if (otherDeclRes.rows.length > 0) {
              finderId = otherDeclRes.rows[0].reporter_id;
            }
          }
        }

        const claimRes = await query(
          'SELECT id FROM claims WHERE doc_id = $1 AND owner_id = $2 ORDER BY created_at DESC LIMIT 1',
          [lostId, userId]
        );
        let claimId: string;
        if (claimRes.rows.length > 0) {
            claimId = claimRes.rows[0].id;
            await query(
                'UPDATE claims SET status = $1, verification_code = $2, finder_id = $3, amount = $4, transaction_id = $5 WHERE id = $6',
                ['PAID', verificationCode, finderId, payment?.amount ?? null, payment?.id ?? null, claimId]
            );
        } else {
            const inserted = await query(
                'INSERT INTO claims (doc_id, owner_id, finder_id, verification_code, status, amount, transaction_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                [lostId, userId, finderId, verificationCode, 'PAID', payment?.amount ?? null, payment?.id ?? null]
            );
            claimId = inserted.rows[0].id;
        }

        await query(
          'UPDATE declarations SET payment_status = $1, status = $2 WHERE id = $3',
          ['PAID', 'MATCHED', lostId]
        );
        if (pair.foundId) {
          await query(
            `UPDATE declarations SET status = 'MATCHED' WHERE id = $1 AND status NOT IN ('RETURNED', 'CANCELLED')`,
            [pair.foundId]
          );
        }

        const { activityLogService } = await import('../services/activity-log.service.ts');
        activityLogService.log({
          user_id: userId,
          action_type: 'RECOVERY_PAYMENT',
          entity_type: 'declaration',
          entity_id: lostId,
          description: `Paiement des frais de récupération pour le document ${lostId}`,
          metadata: { docId: lostId, finderId, verificationCode, transactionId },
        });

        if (finderId) {
            await notificationService.createNotification({
                user_id: finderId,
                type: 'PAYMENT_PENDING',
                title: 'Paiement effectué par le propriétaire',
                message: `Le propriétaire a payé les frais. Validez le code lors de la remise pour recevoir votre récompense.`,
                metadata: { docId: lostId }
            });
        }

        // activateRecovery() est le point de convergence des 4 voies de paiement (NoKash, points,
        // webhook, cron) : ouvrir le fil ici garantit qu'un document payé a toujours une conversation.
        try {
            const { messagingService } = await import('../services/messaging.service.ts');
            await messagingService.openConversationForPair({
                claimId,
                lostDeclaration: { ...declaration, id: lostId },
                foundDeclaration: pair.foundId && pair.foundDecl ? { ...pair.foundDecl, id: pair.foundId } : null,
            });
        } catch (conversationErr) {
            console.error('[activateRecovery] Échec d’ouverture de la conversation:', conversationErr);
        }
    } catch (err) {
        console.error('Error activating recovery:', err);
        throw err;
    }
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

      const statusRes = await nokashService.checkStatus(externalRef);
      const normalized = normalizeNokashStatus(statusRes);

      if (!normalized.status) {
        return;
      }

      console.log(`[Nokash Poll] ${externalRef} -> ${normalized.status}`);

      if (normalized.success) {
        const locked = await query(
          'UPDATE transactions SET status = $1 WHERE id = $2 AND status = $3 RETURNING *',
          ['SUCCESS', transaction.id, 'PENDING']
        );
        if (locked.rows.length === 0) {
          stopNokashPolling(externalRef);
          return;
        }
        await onSuccess(transaction);
        stopNokashPolling(externalRef);
        return;
      }

      if (normalized.terminal) {
        const terminalStatus = normalized.status === 'CANCELLED' ? 'CANCELED' : normalized.status;
        await query('UPDATE transactions SET status = $1 WHERE id = $2', [terminalStatus, transaction.id]);
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
