import { Request, Response } from 'express';
import { query } from '../database/db.ts';
import { v4 as uuidv4 } from 'uuid';
import { subscriptionService } from '../services/subscription.service.ts';
import { notificationService } from '../services/notification.service.ts';
import { nokashService } from '../services/nokash.service.ts';

const NOKASH_POLL_INTERVAL_MS = 5000;
const NOKASH_POLL_TIMEOUT_MS = 5 * 60 * 1000;
const nokashPollTimers = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Handle Nokash Payment Callback
 * Body format: { id, status, amount, phone, orderId }
 */
export const nokashCallback = async (req: Request, res: Response) => {
  console.log('Nokash Callback Received:', req.body);
  
  const { id, status, orderId } = req.body;

  try {
    // 1. Find the transaction
    const transRes = await query('SELECT * FROM transactions WHERE external_ref = $1', [id]);
    if (transRes.rows.length === 0) {
      console.warn(`Transaction not found for Nokash ID: ${id}`);
      return res.status(404).json({ success: false, message: 'Transaction non trouvée' });
    }

    const transaction = transRes.rows[0];

    // 2. If status is SUCCESS and transaction was PENDING
    if (status === 'SUCCESS' && transaction.status === 'PENDING') {
      let metadata = transaction.metadata;
      
      // Safety parse if string (some DB adapters return JSONB as string)
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch(e) { 
          console.error('Metadata parse error:', e);
        }
      }

      const { planId, months } = metadata || {};

      // Update transaction status
      await query('UPDATE transactions SET status = $1 WHERE id = $2', ['SUCCESS', transaction.id]);

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

      // Notify Admins
      await notificationService.notifyAdmins(
        'Nouveau Paiement Reçu',
        `Un paiement de ${transaction.amount} ${transaction.currency} a été effectué avec succès (Réf: ${id}, Type: ${transaction.type}).`,
        'INFO'
      );
    } else if (status === 'FAILED' || status === 'CANCELED') {
      await query('UPDATE transactions SET status = $1 WHERE id = $2', [status, transaction.id]);
      
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
      transactions: result.rows 
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
      'SELECT t.*, u.nom, u.prenom, u.email FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC'
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
      // Optional: check configured/allowed Nokash methods from env (comma-separated)
      // Accept both long names (ORANGE_MONEY/MTN_MOMO) and short Nokash codes (OM/MOMO)
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
        // 1. Check if declaration exists
        const declRes = await query('SELECT * FROM declarations WHERE id = $1', [docId]);
        if (declRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Déclaration non trouvée' });
        }
        const declaration = declRes.rows[0];

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
          await pointsService.redeemPoints(userId, pointsNeeded, 'POINTS_REDEMPTION', `Paiement récupération doc ${docId}`, { docId });
        }

        // 4. Create PENDING transaction (or SUCCESS if points)
        await query(
            `INSERT INTO transactions (user_id, amount, currency, status, payment_method, type, external_ref, metadata) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                userId, 
                finalAmount, 
                isPoints ? 'POINTS' : 'XAF', 
                isPoints ? 'SUCCESS' : 'PENDING', 
                paymentMethod,
                'recovery_fee', 
                isPoints ? orderId : nokashRes.data.id,
                JSON.stringify({ docId })
            ]
        );

        if (isPoints) {
          await activateRecovery(userId, docId, orderId);
          return res.status(200).json({ success: true, message: 'Paiement par points réussi.' });
        }

        startNokashPaymentPolling({
          externalRef: nokashRes.data.id,
          userId,
          docId,
          paymentMethod: paymentMethod || 'MOBILE_MONEY',
          amount: finalAmount,
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
async function activateRecovery(userId: string, docId: string, transactionId: string) {
    try {
        // 1. Fetch data
        const declRes = await query('SELECT * FROM declarations WHERE id = $1', [docId]);
        const declaration = declRes.rows[0];
        const docTypeRes = await query('SELECT * FROM document_types WHERE code = $1 OR id::text = $1', [declaration.doc_type]);
        const docType = docTypeRes.rows[0];

        // 2. Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Identify finder
        const matchRes = await query(
            `SELECT * FROM matches 
             WHERE (lost_declaration_id = $1 OR found_declaration_id = $1) 
             ORDER BY created_at DESC LIMIT 1`,
            [docId]
        );

        let finderId = null;
        if (matchRes.rows.length > 0) {
            const match = matchRes.rows[0];
            const otherId = match.lost_declaration_id === docId ? match.found_declaration_id : match.lost_declaration_id;
            const otherDeclRes = await query('SELECT reporter_id FROM declarations WHERE id = $1', [otherId]);
            if (otherDeclRes.rows.length > 0) {
                finderId = otherDeclRes.rows[0].reporter_id;
            }
        }

        // 4. Create or update claim
        const claimRes = await query('SELECT id FROM claims WHERE doc_id = $1 AND owner_id = $2', [docId, userId]);
        if (claimRes.rows.length > 0) {
            await query(
                'UPDATE claims SET status = $1, verification_code = $2, finder_id = $3 WHERE id = $4',
                ['PAID', verificationCode, finderId, claimRes.rows[0].id]
            );
        } else {
            await query(
                'INSERT INTO claims (doc_id, owner_id, finder_id, verification_code, status) VALUES ($1, $2, $3, $4, $5)',
                [docId, userId, finderId, verificationCode, 'PAID']
            );
        }

        // 5. Update declaration status
        await query('UPDATE declarations SET payment_status = $1, status = $2 WHERE id = $3', ['PAID', 'MATCHED', docId]);

        // 6. Notify finder
        if (finderId) {
            await notificationService.createNotification({
                user_id: finderId,
                type: 'PAYMENT_PENDING',
                title: 'Paiement effectué par le propriétaire',
                message: `Le propriétaire a payé les frais. Vous recevrez votre récompense une fois le code de vérification validé lors de la remise.`,
                metadata: { docId }
            });
        }
    } catch (err) {
        console.error('Error activating recovery:', err);
        throw err;
    }
}

function stopNokashPolling(externalRef: string) {
    const timer = nokashPollTimers.get(externalRef);
    if (timer) {
      clearInterval(timer);
      nokashPollTimers.delete(externalRef);
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

function startNokashPaymentPolling(params: {
  externalRef: string;
  userId: string;
  docId: string;
  paymentMethod: string;
  amount: number;
}) {
  const { externalRef, userId, docId } = params;

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
        'SELECT id, status FROM transactions WHERE external_ref = $1 LIMIT 1',
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
        await query('UPDATE transactions SET status = $1 WHERE id = $2', ['SUCCESS', transaction.id]);
        await activateRecovery(userId, docId, transaction.id);
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
