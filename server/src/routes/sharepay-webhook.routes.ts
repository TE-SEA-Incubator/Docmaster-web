import { Router, Request, Response } from 'express';
import { getSharePayService } from '../services/sharepay.service.ts';
import pool from '../database/db.ts';

const router = Router();

/**
 * SharePay Webhook Handler
 * Reçoit les notifications de SharePay pour les événements de paiement
 */
router.post('/sharepay-webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-sharepay-signature'] as string;
    
    if (!signature) {
      console.error('[SharePay Webhook] Missing signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    
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
    
    const { event, data, timestamp } = req.body;
    
    console.log(`[SharePay Webhook] Event: ${event}`, {
      reference: data?.reference,
      status: data?.status,
      timestamp,
    });
    
    // Handle different event types
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
    console.error('[SharePay Webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(data: any) {
  const { reference, amount, paymentMethod, payerAccount, payerName } = data;
  
  console.log(`[SharePay Webhook] Payment success: ${reference}`);
  
  // Update wallet_transactions table
  const txResult = await pool.query(
    `UPDATE wallet_transactions 
     SET status = $1, provider_reference = $2, metadata = $3, updated_at = NOW()
     WHERE transaction_reference = $4 AND provider = 'SHAREPAY'
     RETURNING user_id, metadata`,
    ['SUCCESS', reference, JSON.stringify(data), reference]
  );

  // If this was a subscription payment, activate it
  if (txResult.rows.length > 0) {
    const tx = txResult.rows[0];
    const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
    
    if (metadata.planId && metadata.months) {
      const { subscriptionService } = await import('../services/subscription.service.js');
      await subscriptionService.activateSubscription(tx.user_id, metadata.planId, metadata.months);
      console.log(`[SharePay Webhook] Subscription activated for user ${tx.user_id}`);
    }
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data: any) {
  const { reference } = data;
  
  console.log(`[SharePay Webhook] Payment failed: ${reference}`);
  
  await pool.query(
    `UPDATE wallet_transactions 
     SET status = $1, metadata = $2, updated_at = NOW()
     WHERE transaction_reference = $3 AND provider = 'SHAREPAY'`,
    ['FAILED', JSON.stringify(data), reference]
  );
}

/**
 * Handle cancelled payment
 */
async function handlePaymentCancelled(data: any) {
  const { reference } = data;
  
  console.log(`[SharePay Webhook] Payment cancelled: ${reference}`);
  
  await pool.query(
    `UPDATE wallet_transactions 
     SET status = $1, metadata = $2, updated_at = NOW()
     WHERE transaction_reference = $3 AND provider = 'SHAREPAY'`,
    ['CANCELLED', JSON.stringify(data), reference]
  );
}

/**
 * Handle expired payment session
 */
async function handlePaymentExpired(data: any) {
  const { reference } = data;
  
  console.log(`[SharePay Webhook] Payment expired: ${reference}`);
  
  await pool.query(
    `UPDATE wallet_transactions 
     SET status = $1, metadata = $2, updated_at = NOW()
     WHERE transaction_reference = $3 AND provider = 'SHAREPAY'`,
    ['EXPIRED', JSON.stringify(data), reference]
  );
}

/**
 * Handle successful payout (withdrawal)
 */
async function handlePayoutSuccess(data: any) {
  const { reference, amount, beneficiaryAccount, beneficiaryName } = data;
  
  console.log(`[SharePay Webhook] Payout success: ${reference}`);
  
  // Update withdrawals table
  await pool.query(
    `UPDATE withdrawals 
     SET status = $1, processed_at = NOW(), provider_reference = $2, metadata = $3
     WHERE withdrawal_reference = $4`,
    ['COMPLETED', reference, JSON.stringify(data), reference]
  );
  
  // Update wallet_transactions
  await pool.query(
    `UPDATE wallet_transactions 
     SET status = $1, metadata = $2, updated_at = NOW()
     WHERE transaction_reference = $3 AND provider = 'SHAREPAY'`,
    ['SUCCESS', JSON.stringify(data), reference]
  );
}

/**
 * Handle failed payout
 */
async function handlePayoutFailed(data: any) {
  const { reference, amount } = data;
  
  console.log(`[SharePay Webhook] Payout failed: ${reference}`);
  
  // Get withdrawal info to refund user
  const withdrawalResult = await pool.query(
    `SELECT user_id, partenaire_id, amount 
     FROM withdrawals 
     WHERE withdrawal_reference = $1`,
    [reference]
  );
  
  if (withdrawalResult.rows.length > 0) {
    const { user_id, partenaire_id, amount } = withdrawalResult.rows[0];
    
    // Refund the balance
    if (user_id) {
      await pool.query(
        `UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
        [amount, user_id]
      );
    } else if (partenaire_id) {
      await pool.query(
        `UPDATE partenaires SET solde = solde + $1 WHERE id = $2`,
        [amount, partenaire_id]
      );
    }
    
    // Update withdrawal status
    await pool.query(
      `UPDATE withdrawals 
       SET status = $1, metadata = $2
       WHERE withdrawal_reference = $3`,
      ['FAILED', JSON.stringify(data), reference]
    );
    
    // Update transaction
    await pool.query(
      `UPDATE wallet_transactions 
       SET status = $1, metadata = $2, updated_at = NOW()
       WHERE transaction_reference = $3 AND provider = 'SHAREPAY'`,
      ['FAILED', JSON.stringify(data), reference]
    );
    
    console.log(`[SharePay Webhook] Refunded ${amount} to user/partner`);
  }
}

/**
 * Handle cancelled payout
 */
async function handlePayoutCancelled(data: any) {
  const { reference } = data;
  
  console.log(`[SharePay Webhook] Payout cancelled: ${reference}`);
  
  // Similar to failed payout - refund the user
  await handlePayoutFailed(data);
}

export default router;
