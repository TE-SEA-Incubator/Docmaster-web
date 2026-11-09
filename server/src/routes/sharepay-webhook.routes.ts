import { Router, Request, Response } from 'express';
import { getSharePayService } from '../services/sharepay.service.ts';
import { subscriptionService } from '../services/subscription.service.ts';
import { withdrawalSettlementService } from '../services/withdrawal-settlement.service.ts';
import { activateRecovery } from '../controllers/payment.controller.ts';
import { releaseReservationByTransaction } from '../utils/recovery.utils.ts';
import pool from '../database/db.ts';

const router = Router();

function parseMetadata(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

/**
 * SharePay Webhook Handler
 * Reçoit les notifications de SharePay pour les événements de paiement
 */
router.post('/sharepay-webhook', async (req: Request, res: Response) => {
  const event = req.body?.event;
  const data = req.body?.data;

  try {
    const signature = req.headers['x-sharepay-signature'] as string;

    if (!signature) {
      console.error('[SharePay Webhook] Missing signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Corps brut conservé par express.json({ verify }) : la signature HMAC
    // doit être calculée sur les octets exacts reçus de SharePay.
    const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);

    const sharepay = getSharePayService();
    const webhookSecret = process.env.SHAREPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[SharePay Webhook] Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const isValid = sharepay.verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      console.error('[SharePay Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log(`[SharePay Webhook] Event: ${event}`, {
      reference: data?.reference,
      status: data?.status,
      timestamp: req.body?.timestamp,
    });

    switch (event) {
      case 'payment.success':
        await handlePaymentSuccess(data);
        break;

      case 'payment.failed':
        await handlePaymentFailed(data);
        break;

      case 'payment.cancelled':
        await handlePaymentCancelled(data);
        break;

      case 'payment.expired':
        await handlePaymentExpired(data);
        break;

      case 'payout.success':
        await handlePayoutSuccess(data);
        break;

      case 'payout.failed':
        await handlePayoutFailed(data);
        break;

      case 'payout.cancelled':
        await handlePayoutCancelled(data);
        break;

      case 'webhook.test':
        console.log('[SharePay Webhook] Test event received');
        break;

      default:
        console.log(`[SharePay Webhook] Unhandled event: ${event}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    // Un échec de traitement doit renvoyer une erreur pour que SharePay
    // réessaie l'événement (activation de récupération, etc.).
    console.error(`[SharePay Webhook] Error handling ${event}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(data: any) {
  const reference = data?.reference || data?.providerReference || data?.transactionReference;

  if (!reference) {
    console.error('[SharePay Webhook] payment.success without reference');
    return;
  }

  console.log(`[SharePay Webhook] Payment success: ${reference}`);

  // Transactions DocMaster : table `transactions` (abonnements, récupérations,
  // achats de points). On ne traite que la transition PENDING -> SUCCESS afin
  // d'être idempotent si SharePay rejoue l'événement.
  const txResult = await pool.query(
    `UPDATE transactions
     SET status = 'SUCCESS', updated_at = NOW()
     WHERE external_ref = $1 AND status = 'PENDING'
     RETURNING id, user_id, amount, type, metadata, payment_method`,
    [reference]
  );

  for (const tx of txResult.rows) {
    const metadata = parseMetadata(tx.metadata);

    try {
      if (tx.type === 'subscription') {
        if (metadata.planId) {
          await subscriptionService.activateSubscription(
            tx.user_id,
            metadata.planId,
            metadata.months || 1
          );
          console.log(`[SharePay Webhook] Subscription activated for user ${tx.user_id}`);
        }
      } else if (tx.type === 'recovery_fee') {
        await activateRecovery(tx.user_id, metadata.docId, tx.id, {
          matchId: metadata.matchId,
          foundId: metadata.foundId,
          reservationId: metadata.reservationId,
        });
        console.log(`[SharePay Webhook] Recovery activated for doc ${metadata.docId} (tx ${tx.id})`);
      } else if (tx.type === 'points_purchase') {
        const pointsAmount = Number(metadata.pointsAmount || 0);
        if (pointsAmount > 0) {
          await pool.query(
            'UPDATE users SET points = COALESCE(points, 0) + $1, updated_at = NOW() WHERE id = $2',
            [pointsAmount, tx.user_id]
          );
          await pool.query(
            `INSERT INTO earnings_history (user_id, type, amount, currency, description, metadata)
             VALUES ($1, 'POINTS_PURCHASE', $2, 'POINTS', $3, $4)`,
            [
              tx.user_id,
              pointsAmount,
              `Achat de ${pointsAmount} points`,
              JSON.stringify({ transactionId: tx.id, provider: 'SHAREPAY' }),
            ]
          );
          console.log(`[SharePay Webhook] Points credited: ${pointsAmount} to user ${tx.user_id}`);
        }
      }
    } catch (error) {
      console.error(`[SharePay Webhook] Post-payment processing failed for tx ${tx.id}:`, error);

      // Une récupération payée mais non activée doit repasser PENDING pour être
      // réessayée (webhook suivant, polling ou réconciliation).
      if (tx.type === 'recovery_fee') {
        await pool.query(
          `UPDATE transactions SET status = 'PENDING'
           WHERE id = $1 AND status = 'SUCCESS' AND type = 'recovery_fee'`,
          [tx.id]
        );
      }
      throw error;
    }
  }

  if (txResult.rows.length === 0) {
    console.warn(`[SharePay Webhook] No pending transaction found for reference ${reference}`);
  }
}

async function markPaymentFailure(reference: string | undefined, status: string) {
  if (!reference) {
    console.error(`[SharePay Webhook] payment event without reference (${status})`);
    return;
  }

  console.log(`[SharePay Webhook] Payment ${status}: ${reference}`);

  const result = await pool.query(
    `UPDATE transactions
     SET status = $1, updated_at = NOW()
     WHERE external_ref = $2 AND status = 'PENDING'
     RETURNING id, type`,
    [status, reference]
  );

  for (const tx of result.rows) {
    if (tx.type === 'recovery_fee') {
      await releaseReservationByTransaction(tx.id);
    }
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data: any) {
  await markPaymentFailure(data?.reference, 'FAILED');
}

/**
 * Handle cancelled payment
 */
async function handlePaymentCancelled(data: any) {
  await markPaymentFailure(data?.reference, 'CANCELED');
}

/**
 * Handle expired payment session
 */
async function handlePaymentExpired(data: any) {
  await markPaymentFailure(data?.reference, 'EXPIRED');
}

async function findWithdrawal(reference: string | undefined) {
  if (!reference) return null;
  const result = await pool.query(
    `SELECT id, user_id, partenaire_id, source_type, amount, payment_details, status
     FROM withdrawals
     WHERE withdrawal_reference = $1 OR provider_reference = $1 OR id::text = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [reference]
  );
  return result.rows[0] || null;
}

/**
 * Handle successful payout (withdrawal)
 */
async function handlePayoutSuccess(data: any) {
  const reference = data?.reference;
  console.log(`[SharePay Webhook] Payout success: ${reference}`);

  const withdrawal = await findWithdrawal(reference);
  if (!withdrawal) {
    console.warn(`[SharePay Webhook] Withdrawal not found for payout ${reference}`);
    return;
  }

  if (withdrawal.status === 'COMPLETED') {
    return;
  }

  if (withdrawal.partenaire_id || withdrawal.source_type === 'PARTENAIRE') {
    await pool.query(
      `UPDATE withdrawals
       SET status = 'COMPLETED', processed_at = NOW(), updated_at = NOW(),
           provider = 'SHAREPAY', provider_reference = COALESCE(provider_reference, $2)
       WHERE id = $1`,
      [withdrawal.id, reference]
    );
    return;
  }

  await withdrawalSettlementService.applyNokashPayoutResult(withdrawal.id, {
    status: 'SUCCESS',
    id: reference,
    phone: withdrawal.payment_details,
  });
}

async function handlePayoutFailure(data: any, fallbackStatus: string) {
  const reference = data?.reference;
  const status = (data?.status || fallbackStatus || 'FAILED').toString().toUpperCase();
  console.log(`[SharePay Webhook] Payout ${status}: ${reference}`);

  const withdrawal = await findWithdrawal(reference);
  if (!withdrawal) {
    console.warn(`[SharePay Webhook] Withdrawal not found for payout ${reference}`);
    return;
  }

  if (withdrawal.status === 'REJECTED' || withdrawal.status === 'COMPLETED') {
    return;
  }

  // Retraits partenaires : remboursement sur le wallet partenaire.
  if (withdrawal.partenaire_id || withdrawal.source_type === 'PARTENAIRE') {
    const client = await pool.getClient();
    try {
      await client.query('BEGIN');
      const partnerId = withdrawal.partenaire_id || withdrawal.user_id;
      const pRes = await client.query(
        'SELECT wallet_balance FROM partenaires WHERE id = $1 FOR UPDATE',
        [partnerId]
      );
      if (pRes.rows.length === 0) {
        throw new Error('Partenaire introuvable pour le remboursement du retrait');
      }

      const balanceBefore = parseFloat(pRes.rows[0].wallet_balance || '0');
      const balanceAfter = balanceBefore + Number(withdrawal.amount);

      await client.query(
        'UPDATE partenaires SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
        [balanceAfter, partnerId]
      );
      await client.query(
        `INSERT INTO partenaire_wallet_transactions
         (partenaire_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
         VALUES ($1, $2, $3, $4, 'CREDIT', 'WITHDRAWAL', $5, 'withdrawal', $6)`,
        [
          partnerId,
          Number(withdrawal.amount),
          balanceBefore,
          balanceAfter,
          withdrawal.id,
          JSON.stringify({ refund: true, reason: status, provider: 'SHAREPAY' }),
        ]
      );
      await client.query(
        `UPDATE withdrawals
         SET status = 'REJECTED', provider = 'SHAREPAY',
             admin_note = $2, processed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [withdrawal.id, `Échec Payout SharePay: ${status} (Fonds recrédités)`]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  await withdrawalSettlementService.applyNokashPayoutResult(withdrawal.id, {
    status: 'FAILED',
    id: reference,
    phone: withdrawal.payment_details,
  });
}

/**
 * Handle failed payout
 */
async function handlePayoutFailed(data: any) {
  await handlePayoutFailure(data, 'FAILED');
}

/**
 * Handle cancelled payout
 */
async function handlePayoutCancelled(data: any) {
  await handlePayoutFailure(data, 'CANCELLED');
}

export default router;
