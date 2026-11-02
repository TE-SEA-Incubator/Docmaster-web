import { Request, Response } from 'express';
import { WithdrawalRepository } from '../repositories/withdrawal.repository.js';
import { SettingRepository } from '../repositories/setting.repository.js';
import { UserRepository } from '../repositories/auth.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { notificationService } from '../services/notification.service.js';
import { activityLogService } from '../services/activity-log.service.js';
import { payoutService } from '../services/payout.service.js';
import { withdrawalSettlementService } from '../services/withdrawal-settlement.service.ts';
import { pool } from '../database/db.js';

const withdrawalRepo = new WithdrawalRepository();
const settingRepo = new SettingRepository();
const userRepo = new UserRepository();
const transactionRepo = new TransactionRepository();

export class WithdrawalController {

  /**
   * Admin: Approve a withdrawal (Manual or Automated via Nokash Payout)
   */
  async approveWithdrawal(req: Request, res: Response) {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { adminNote, autoPayout } = req.body;
      const withdrawalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      await client.query('BEGIN');

      // 1. Row-level lock on the withdrawal to prevent concurrent double-approvals
      const existingRes = await client.query(
        'SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE',
        [withdrawalId]
      );
      if (existingRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Demande de retrait introuvable.' });
      }

      const withdrawal = existingRes.rows[0];

      if (withdrawal.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Impossible d'approuver un retrait avec le statut actuel: ${withdrawal.status}`,
        });
      }

      // Option A: Automated Payout via Unified Payout Service (Nokash or SharePay)
      if (autoPayout) {
        // Mark as PROCESSING inside the SQL transaction
        await client.query(
          'UPDATE withdrawals SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3',
          ['PROCESSING', adminNote || 'Payout en cours d\'initiation...', withdrawalId]
        );
        await client.query('COMMIT');

        try {
          // Get user info for SharePay
          const userRes = await pool.query('SELECT nom, prenom, email FROM users WHERE id = $1', [withdrawal.user_id]);
          const user = userRes.rows[0];
          
          const payoutRes = await payoutService.initiatePayout({
            amount: Number(withdrawal.amount),
            order_id: withdrawal.id,
            user_phone: withdrawal.payment_details,
            payment_method: withdrawal.payment_method,
            user_name: user ? `${user.prenom} ${user.nom}` : undefined,
            user_email: user?.email,
            description: `Retrait DocMaster - ${withdrawal.amount} XAF`,
            user_type: 'USER',
          });

          if (payoutRes.success) {
            await pool.query(
              'UPDATE withdrawals SET admin_note = $1, updated_at = NOW() WHERE id = $2',
              [`${payoutRes.provider} Payout initié (Ref: ${payoutRes.reference})`, withdrawalId]
            );

            activityLogService.log({
              user_id: (req as any).user.id,
              action_type: 'INITIATE_PAYOUT',
              entity_type: 'withdrawal',
              entity_id: withdrawalId,
              description: `Payout ${payoutRes.provider} initié pour ${withdrawal.amount} XAF vers ${withdrawal.payment_details}`,
              metadata: { provider: payoutRes.provider, reference: payoutRes.reference, data: payoutRes.data },
            }).catch(() => {});

            return res.json({
              success: true,
              message: payoutRes.message || `Payout ${payoutRes.provider} initié avec succès`,
              data: { withdrawal: { ...withdrawal, status: 'PROCESSING' }, payout: payoutRes.data },
            });
          } else {
            // Revert status to PENDING on initiation error
            await pool.query(
              'UPDATE withdrawals SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3',
              ['PENDING', `Échec initiation ${payoutRes.provider}: ${payoutRes.message}`, withdrawalId]
            );
            return res.status(400).json({
              success: false,
              message: `Erreur ${payoutRes.provider} Payout: ${payoutRes.message}`,
            });
          }
        } catch (payoutErr: any) {
          await pool.query(
            'UPDATE withdrawals SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3',
            ['PENDING', `Exception Payout: ${payoutErr.message}`, withdrawalId]
          );
          throw payoutErr;
        }
      }

      // Option B: Manual Approval (Solde déjà débité lors de la demande)
      // 1. Mark withdrawal as COMPLETED
      const updatedWithdrawalRes = await client.query(
        'UPDATE withdrawals SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        ['COMPLETED', adminNote || 'Approbation manuelle', withdrawalId]
      );

      // 2. Update transaction table
      await client.query(
        `UPDATE transactions SET status = 'SUCCESS', updated_at = NOW() 
         WHERE user_id = $1 AND type = 'withdrawal' AND (metadata->>'withdrawalId' = $2 OR id::text = $2)`,
        [withdrawal.user_id, withdrawalId]
      );

      await client.query('COMMIT');

      // Send Push Notification
      notificationService.createNotification({
        user_id: withdrawal.user_id,
        type: 'WITHDRAWAL_COMPLETED',
        title: 'Retrait Confirmé 💸',
        message: `Votre demande de retrait de ${withdrawal.amount} XAF a été validée et envoyée.`,
        metadata: { withdrawalId: withdrawal.id },
      }).catch(() => {});

      res.json({
        success: true,
        message: 'Retrait approuvé avec succès.',
        data: updatedWithdrawalRes.rows[0],
      });

      activityLogService.log({
        user_id: (req as any).user.id,
        action_type: 'APPROVE_WITHDRAWAL',
        entity_type: 'withdrawal',
        entity_id: withdrawalId,
        description: `Approbation manuelle du retrait de ${withdrawal.amount} XAF`,
        metadata: { adminNote },
      }).catch(() => {});
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('❌ [Approve Withdrawal Transaction Error]:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      client.release();
    }
  }

  /**
   * Admin: Reject a withdrawal (Remboursement automatique du solde utilisateur)
   */
  async rejectWithdrawal(req: Request, res: Response) {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { adminNote } = req.body;
      const withdrawalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      await client.query('BEGIN');

      const existingRes = await client.query(
        'SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE',
        [withdrawalId]
      );
      if (existingRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Demande de retrait introuvable.' });
      }

      const withdrawal = existingRes.rows[0];

      if (withdrawal.status === 'REJECTED' || withdrawal.status === 'COMPLETED') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Ce retrait est déjà au statut final: ${withdrawal.status}`,
        });
      }

      const amountToRefund = Number(withdrawal.amount);

      // 1. Rembourser le solde de l'utilisateur
      const userRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [withdrawal.user_id]);
      const balanceBefore = parseFloat(userRes.rows[0]?.wallet_balance || '0');
      const balanceAfter = balanceBefore + amountToRefund;

      await client.query(
        'UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
        [balanceAfter, withdrawal.user_id]
      );

      // 2. Trace du remboursement dans wallet_transactions
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
         VALUES ($1, $2, $3, $4, 'CREDIT', 'WITHDRAWAL', $5, 'withdrawal', $6)`,
        [
          withdrawal.user_id,
          amountToRefund,
          balanceBefore,
          balanceAfter,
          withdrawal.id,
          JSON.stringify({ adminNote, refund: true, reason: 'ADMIN_REJECTED' }),
        ]
      );

      // 3. Mettre à jour le retrait à REJECTED
      const updated = await client.query(
        'UPDATE withdrawals SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        ['REJECTED', adminNote || 'Rejeté par l\'administrateur (Fonds recrédités)', withdrawalId]
      );

      // 4. Mettre à jour la transaction à FAILED
      await client.query(
        `UPDATE transactions SET status = 'FAILED', updated_at = NOW() 
         WHERE user_id = $1 AND type = 'withdrawal' AND (metadata->>'withdrawalId' = $2 OR id::text = $2)`,
        [withdrawal.user_id, withdrawalId]
      );

      await client.query('COMMIT');

      notificationService.createNotification({
        user_id: withdrawal.user_id,
        type: 'WITHDRAWAL_FAILED',
        title: 'Retrait Rejeté & Fonds Recrédités 🔄',
        message: `Votre demande de retrait de ${withdrawal.amount} XAF a été rejetée. Vos fonds ont été automatiquement recrédités sur votre solde. Motif: ${adminNote || 'Non spécifié'}`,
        metadata: { withdrawalId: withdrawal.id },
      }).catch(() => {});

      res.json({ success: true, message: 'Retrait rejeté et fonds recrédités.', data: updated.rows[0] });

      activityLogService.log({
        user_id: (req as any).user.id,
        action_type: 'REJECT_WITHDRAWAL',
        entity_type: 'withdrawal',
        entity_id: withdrawalId,
        description: `Rejet du retrait de ${withdrawal.amount} XAF et remboursement`,
        metadata: { adminNote },
      }).catch(() => {});
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('❌ [Reject Withdrawal Transaction Error]:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      client.release();
    }
  }

  /**
   * Admin: List all pending withdrawals
   */
  async getAllPendingWithdrawals(req: Request, res: Response) {
    try {
      const query = `
        SELECT w.*, u.nom, u.prenom, u.email, CONCAT(u.prenom, ' ', u.nom) as user_name 
        FROM withdrawals w 
        JOIN users u ON w.user_id = u.id 
        WHERE w.status IN ('PENDING', 'PROCESSING') 
        ORDER BY w.created_at ASC
      `;
      const { rows } = await pool.query(query);
      res.json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * User: Instant Automated Withdrawal (Débit immédiat + Remboursement si échec)
   */
  async requestWithdrawal(req: Request, res: Response) {
    const client = await pool.connect();
    let createdWithdrawal: any = null;
    let newBalance = 0;

    try {
      const userId = (req as any).user.id;
      const { amount } = req.body;
      const numAmount = Number(amount);

      const paymentMethod = (
        req.body.paymentMethod ||
        req.body.payment_method ||
        req.body.method ||
        'MTN_MOMO'
      ).toString();

      const paymentDetails = (
        req.body.paymentDetails ||
        req.body.payment_details ||
        req.body.phone ||
        req.body.account_number ||
        ''
      ).toString().trim();

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Montant invalide.' });
      }

      if (!paymentDetails || paymentDetails.length < 9) {
        return res.status(400).json({
          success: false,
          message: 'Numéro de téléphone Mobile Money invalide (au moins 9 chiffres requis).',
        });
      }

      await client.query('BEGIN');

      // 1. Get minimum withdrawal amount from settings
      const settingRes = await client.query(
        "SELECT value FROM app_settings WHERE key = 'min_withdrawal_amount' LIMIT 1"
      );
      const rawMin = settingRes.rows[0]?.value;
      const minAmount = Number(
        typeof rawMin === 'string' ? rawMin.replace(/"/g, '') : rawMin ?? 25
      ) || 25;
      if (numAmount < minAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Le montant minimum pour un retrait est de ${minAmount} XAF.`,
        });
      }

      // 2. Lock user row and verify current balance
      const userRes = await client.query(
        'SELECT wallet_balance, nom, prenom FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );
      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
      }

      // 2b. 🔒 SECURITY: Block if there is already an active withdrawal (PENDING or PROCESSING)
      // This prevents the "double spend" vulnerability where a user could request a new withdrawal
      // while a previous one is still being processed, even after a partial refund race condition.
      const activeWithdrawalRes = await client.query(
        `SELECT id, amount, status FROM withdrawals 
         WHERE user_id = $1 AND status IN ('PENDING', 'PROCESSING') 
         LIMIT 1`,
        [userId]
      );
      if (activeWithdrawalRes.rows.length > 0) {
        const active = activeWithdrawalRes.rows[0];
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Vous avez déjà un retrait en cours de traitement (${active.amount} XAF, statut: ${active.status}). Veuillez patienter avant d'en effectuer un nouveau.`,
          data: { activeWithdrawalId: active.id },
        });
      }

      const currentBalance = parseFloat(userRes.rows[0].wallet_balance || '0');

      if (currentBalance < numAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Solde insuffisant (${currentBalance} XAF disponible).`,
        });
      }

      newBalance = currentBalance - numAmount;

      // 3. Débit IMMÉDIAT du solde utilisateur
      await client.query(
        'UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
        [newBalance, userId]
      );

      // 4. Create withdrawal record with status PROCESSING
      const insertWithdrawalRes = await client.query(
        `INSERT INTO withdrawals (user_id, amount, payment_method, payment_details, status)
         VALUES ($1, $2, $3, $4, 'PROCESSING')
         RETURNING *`,
        [userId, numAmount, paymentMethod, paymentDetails]
      );
      createdWithdrawal = insertWithdrawalRes.rows[0];

      // 5. Trace du débit dans wallet_transactions
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
         VALUES ($1, $2, $3, $4, 'DEBIT', 'WITHDRAWAL', $5, 'withdrawal', $6)`,
        [
          userId,
          numAmount,
          currentBalance,
          newBalance,
          createdWithdrawal.id,
          JSON.stringify({ phone: paymentDetails, paymentMethod }),
        ]
      );

      // 6. Record as pending transaction
      await client.query(
        `INSERT INTO transactions (user_id, amount, currency, type, status, payment_method, metadata)
         VALUES ($1, $2, 'XAF', 'withdrawal', 'PENDING', $3, $4)`,
        [
          userId,
          -numAmount,
          paymentMethod,
          JSON.stringify({ withdrawalId: createdWithdrawal.id, phone: paymentDetails }),
        ]
      );

      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('❌ [Withdrawal Init Error]:', error);
      return res.status(500).json({ success: false, message: error.message });
    } finally {
      client.release();
    }

    // 7. Trigger Payout API immediately (SharePay or Nokash based on config)
    try {
      const payoutRes = await payoutService.initiatePayout({
        amount: Number(createdWithdrawal.amount),
        order_id: createdWithdrawal.id,
        user_phone: createdWithdrawal.payment_details,
        payment_method: createdWithdrawal.payment_method,
      });

      if (payoutRes.status === 'REQUEST_OK' && payoutRes.data) {
        await pool.query(
          'UPDATE withdrawals SET admin_note = $1, updated_at = NOW() WHERE id = $2',
          [`Paiement initié (Réf: ${payoutRes.data.id})`, createdWithdrawal.id]
        );

        // Notify user that payout is in flight
        notificationService.createNotification({
          user_id: createdWithdrawal.user_id,
          type: 'WITHDRAWAL_INITIATED',
          title: 'Retrait en cours de transfert ⏳',
          message: `Votre virement de ${createdWithdrawal.amount} XAF vers le ${createdWithdrawal.payment_details} a été initié. Vous recevrez une confirmation dès validation par votre opérateur.`,
          metadata: { withdrawalId: createdWithdrawal.id, paymentRef: payoutRes.data.id },
        }).catch(() => {});

        // Notify admins
        notificationService.notifyAdmins(
          'Nouveau Retrait Automatique Initié',
          `Un virement automatique de ${createdWithdrawal.amount} XAF vers le ${createdWithdrawal.payment_details} a été envoyé (Réf: ${payoutRes.data.id}).`,
          'INFO'
        ).catch(() => {});

        activityLogService.log({
          user_id: createdWithdrawal.user_id,
          action_type: 'INITIATE_PAYOUT',
          entity_type: 'withdrawal',
          entity_id: createdWithdrawal.id,
          description: `Retrait automatique initié pour ${createdWithdrawal.amount} XAF vers ${createdWithdrawal.payment_details}`,
          metadata: { payment: payoutRes.data },
        }).catch(() => {});

        return res.json({
          success: true,
          message: 'Retrait initié avec succès. Votre solde a été mis à jour.',
          data: { withdrawal: createdWithdrawal, new_wallet_balance: newBalance, payment: payoutRes.data },
        });
      } else {
        // Payout initiation rejected by Nokash -> Remboursement automatique immédiat
        const refundClient = await pool.connect();
        try {
          await refundClient.query('BEGIN');
          const uRes = await refundClient.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [createdWithdrawal.user_id]);
          const curBal = parseFloat(uRes.rows[0]?.wallet_balance || '0');
          const refundedBal = curBal + Number(createdWithdrawal.amount);
          
          await refundClient.query('UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [refundedBal, createdWithdrawal.user_id]);
          await refundClient.query(
            `INSERT INTO wallet_transactions (user_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
             VALUES ($1, $2, $3, $4, 'CREDIT', 'WITHDRAWAL', $5, 'withdrawal', $6)`,
            [createdWithdrawal.user_id, Number(createdWithdrawal.amount), curBal, refundedBal, createdWithdrawal.id, JSON.stringify({ refund: true, reason: 'INITIATION_REJECTED' })]
          );
          await refundClient.query('UPDATE withdrawals SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3', ['REJECTED', `Échec initiation paiement: ${payoutRes.message || 'Erreur opérateur'} (Fonds recrédités)`, createdWithdrawal.id]);
          await refundClient.query(`UPDATE transactions SET status = 'FAILED', updated_at = NOW() WHERE user_id = $1 AND type = 'withdrawal' AND (metadata->>'withdrawalId' = $2 OR id::text = $2)`, [createdWithdrawal.user_id, createdWithdrawal.id]);
          await refundClient.query('COMMIT');
        } catch (rErr) {
          await refundClient.query('ROLLBACK').catch(() => {});
          console.error('❌ [Auto Refund Error]:', rErr);
        } finally {
          refundClient.release();
        }

        return res.status(400).json({
          success: false,
          message: `Échec du virement: ${payoutRes.message || 'Numéro ou opérateur non pris en charge.'}. Vos fonds ont été recrédités.`,
        });
      }
    } catch (payoutErr: any) {
      console.error('❌ [Instant Payout Call Failed]:', payoutErr);

      // Remboursement automatique en cas d'exception
      const refundClient = await pool.connect();
      try {
        await refundClient.query('BEGIN');
        const uRes = await refundClient.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [createdWithdrawal.user_id]);
        const curBal = parseFloat(uRes.rows[0]?.wallet_balance || '0');
        const refundedBal = curBal + Number(createdWithdrawal.amount);

        await refundClient.query('UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [refundedBal, createdWithdrawal.user_id]);
        await refundClient.query(
          `INSERT INTO wallet_transactions (user_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
           VALUES ($1, $2, $3, $4, 'CREDIT', 'WITHDRAWAL', $5, 'withdrawal', $6)`,
          [createdWithdrawal.user_id, Number(createdWithdrawal.amount), curBal, refundedBal, createdWithdrawal.id, JSON.stringify({ refund: true, reason: 'EXCEPTION_PAYOUT' })]
        );
        await refundClient.query('UPDATE withdrawals SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3', ['REJECTED', `Exception Payout: ${payoutErr.message} (Fonds recrédités)`, createdWithdrawal.id]);
        await refundClient.query(`UPDATE transactions SET status = 'FAILED', updated_at = NOW() WHERE user_id = $1 AND type = 'withdrawal' AND (metadata->>'withdrawalId' = $2 OR id::text = $2)`, [createdWithdrawal.user_id, createdWithdrawal.id]);
        await refundClient.query('COMMIT');
      } catch (rErr) {
        await refundClient.query('ROLLBACK').catch(() => {});
        console.error('❌ [Auto Refund Error on Exception]:', rErr);
      } finally {
        refundClient.release();
      }

      return res.status(500).json({
        success: false,
        message: `Erreur lors de l'envoi du virement Mobile Money: ${payoutErr.message}. Vos fonds ont été recrédités.`,
      });
    }
  }

  async getMyWithdrawals(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const withdrawals = await withdrawalRepo.findByUserId(userId);
      res.json({ success: true, data: withdrawals });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Webhook Callback called by Nokash when Mobile Money payout completes or fails
   * Wrapped in an ACID Database Transaction with row-locking
   */
  async nokashPayoutCallback(req: Request, res: Response) {
    console.log('📥 [Nokash Payout Callback Received]:', req.body);
    const { id, status, phone, orderId } = req.body;

    try {
      if (!orderId) {
        return res.status(400).json({ success: false, message: 'orderId manquant' });
      }

      const result = await withdrawalSettlementService.applyNokashPayoutResult(orderId, {
        status,
        id,
        phone,
      });

      if (result.code === 'NOT_FOUND') {
        return res.status(404).json({ success: false, message: result.message });
      }

      // Toujours 200 OK pour Nokash (y compris si déjà traité)
      return res.status(200).json({
        success: true,
        message: result.code === 'IGNORED' ? result.message : 'Callback processed',
      });
    } catch (error: any) {
      console.error('❌ [Nokash Payout Callback Transaction Error]:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
