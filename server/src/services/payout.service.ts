/**
 * Unified Payout Service
 * Handles withdrawals using either NokashPay or SharePay based on configuration
 */

import { getSharePayService } from './sharepay.service.js';
import { nokashPayoutService } from './nokash-payout.service.js';
import { getPaymentProvider, shouldUseSharePay } from '../config/features.js';
import pool from '../database/db.js';

export interface PayoutRequest {
  amount: number;
  order_id: string;
  user_phone: string;
  payment_method: 'MTN' | 'ORANGE';
  user_name?: string;
  user_email?: string;
  description?: string;
  user_type?: 'PARTNER' | 'USER';
}

export interface PayoutResponse {
  success: boolean;
  provider: 'NOKASH' | 'SHAREPAY';
  reference: string;
  status: string;
  message?: string;
  data?: any;
}

class PayoutService {
  /**
   * Initiate a payout using the configured provider
   */
  async initiatePayout(request: PayoutRequest): Promise<PayoutResponse> {
    const userType = request.user_type || 'USER';
    const provider = getPaymentProvider(userType);

    console.log(`[Payout] Initiating ${request.amount} XAF via ${provider} for ${userType}`);

    if (provider === 'SHAREPAY') {
      return this.initiatePayoutSharePay(request);
    } else {
      return this.initiatePayoutNokash(request);
    }
  }

  /**
   * Initiate payout via SharePay
   */
  private async initiatePayoutSharePay(request: PayoutRequest): Promise<PayoutResponse> {
    try {
      const sharepay = getSharePayService();

      const paymentMethod = request.payment_method === 'MTN' 
        ? 'MTN_MOMO_CM' 
        : 'ORANGE_MONEY_CM';

      console.log(`[SharePay] 🚀 Initiation payout (retrait)`, {
        amount: Math.round(request.amount),
        currency: 'XAF',
        paymentMethod,
        beneficiaryAccount: request.user_phone?.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
        beneficiaryName: request.user_name || 'Utilisateur DocMaster',
        merchantReference: `WITHDRAW-${request.order_id}`,
        description: request.description || `Retrait DocMaster - ${request.amount} XAF`,
        userType: request.user_type || 'USER',
        orderId: request.order_id,
      });

      const result = await sharepay.createTransfer({
        amount: Math.round(request.amount),
        currency: 'XAF',
        paymentMethod,
        beneficiaryAccount: request.user_phone,
        beneficiaryName: request.user_name || 'Utilisateur DocMaster',
        beneficiaryEmail: request.user_email,
        merchantReference: `WITHDRAW-${request.order_id}`,
        description: request.description || `Retrait DocMaster - ${request.amount} XAF`,
      });

      console.log(`[SharePay] ✅ Réponse transfer reçue`, {
        reference: result.reference,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
      });

      console.log(`[SharePay] ⏳ Mise à jour DB withdrawal: ${request.order_id} → PROCESSING (ref: ${result.reference})`);

      // Update withdrawal with SharePay reference and provider
      await pool.query(
        `UPDATE withdrawals 
         SET provider = $1, provider_reference = $2, withdrawal_reference = $3, 
             status = $4, updated_at = NOW()
         WHERE id = $5`,
        ['SHAREPAY', result.reference, result.reference, 'PROCESSING', request.order_id]
      );

      // Create transaction record
      await pool.query(
        `INSERT INTO wallet_transactions 
         (user_id, type, amount, currency, status, transaction_reference, provider, provider_reference, description, created_at)
         SELECT user_id, 'WITHDRAWAL', $1, 'XAF', 'PENDING', $2, 'SHAREPAY', $2, $3, NOW()
         FROM withdrawals WHERE id = $4`,
        [-request.amount, result.reference, request.description, request.order_id]
      );

      console.log(`[SharePay] ✅ Payout enregistré en DB. Référence: ${result.reference} | Statut: ${result.status}`);

      return {
        success: true,
        provider: 'SHAREPAY',
        reference: result.reference,
        status: result.status,
        message: 'Virement initié via SharePay. Vous recevrez une notification dès le traitement.',
        data: result,
      };
    } catch (error: any) {
      console.error(`[SharePay] ❌ Erreur payout`, {
        orderId: request.order_id,
        amount: request.amount,
        phone: request.user_phone?.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
        error: error.message,
        code: (error as any).code,
        statusCode: (error as any).statusCode,
      });
      
      return {
        success: false,
        provider: 'SHAREPAY',
        reference: '',
        status: 'FAILED',
        message: error.message || 'Erreur lors de l\'initiation du virement SharePay',
        data: { error: error.message },
      };
    }
  }

  /**
   * Initiate payout via NokashPay (existing implementation)
   */
  private async initiatePayoutNokash(request: PayoutRequest): Promise<PayoutResponse> {
    try {
      const result = await nokashPayoutService.initiatePayout({
        amount: request.amount,
        order_id: request.order_id,
        user_phone: request.user_phone,
        payment_method: request.payment_method,
      });

      if (result.status === 'REQUEST_OK' && result.data) {
        // Update withdrawal with Nokash reference
        await pool.query(
          `UPDATE withdrawals 
           SET provider = $1, provider_reference = $2, updated_at = NOW()
           WHERE id = $3`,
          ['NOKASH', result.data.id, request.order_id]
        );

        console.log(`[Payout] Nokash payout initiated: ${result.data.id}`);

        return {
          success: true,
          provider: 'NOKASH',
          reference: result.data.id,
          status: 'PROCESSING',
          message: 'Payout Nokash initié avec succès',
          data: result.data,
        };
      } else {
        return {
          success: false,
          provider: 'NOKASH',
          reference: '',
          status: 'FAILED',
          message: result.message || 'Erreur Nokash Payout',
          data: result,
        };
      }
    } catch (error: any) {
      console.error('[Payout] Nokash error:', error);
      
      return {
        success: false,
        provider: 'NOKASH',
        reference: '',
        status: 'FAILED',
        message: error.message || 'Erreur lors de l\'initiation du payout Nokash',
        data: { error: error.message },
      };
    }
  }

  /**
   * Check payout status
   */
  async checkPayoutStatus(reference: string, provider: 'NOKASH' | 'SHAREPAY'): Promise<any> {
    if (provider === 'SHAREPAY') {
      const sharepay = getSharePayService();
      return sharepay.getPayOutStatus(reference);
    } else {
      // Nokash status check (if available)
      console.log('[Payout] Nokash status check not implemented');
      return null;
    }
  }
}

export const payoutService = new PayoutService();
