import { pool } from '../database/db.ts';
import { notificationService } from './notification.service.ts';

export interface NokashPayoutOutcome {
  status?: string;
  id?: string;
  phone?: string;
}

export interface SettlementResult {
  applied: boolean;
  code: 'COMPLETED' | 'REJECTED' | 'IGNORED' | 'NOT_FOUND';
  message: string;
}

const SUCCESS_STATUSES = ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'COMPLETED'];
const FAILED_STATUSES = ['FAILED', 'CANCELED', 'CANCELLED', 'TIMEOUT', 'REJECTED'];

/**
 * Applique le résultat d'un payout Nokash (callback HTTP ou poller de
 * réconciliation) sur un retrait, dans une transaction ACID :
 *  - SUCCESS  : COMPLETED + tx SUCCESS (solde déjà débité à la demande)
 *  - FAILED   : REJECTED + tx FAILED + REMBOURSEMENT AUTOMATIQUE DU SOLDE
 * Idempotent : un retrait déjà COMPLETED ou REJECTED n'est pas traité deux fois.
 */
class WithdrawalSettlementService {
  async applyNokashPayoutResult(orderId: string, outcome: NokashPayoutOutcome): Promise<SettlementResult> {
    const { status, id, phone } = outcome;
    const normalizedStatus = (status || '').toString().toUpperCase();
    const isSuccess = SUCCESS_STATUSES.includes(normalizedStatus);
    const isFailed = FAILED_STATUSES.includes(normalizedStatus);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const withdrawalRes = await client.query('SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE', [
        orderId,
      ]);
      if (withdrawalRes.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn(`⚠️ [Withdrawal Settlement] Retrait introuvable pour orderId: ${orderId}`);
        return { applied: false, code: 'NOT_FOUND', message: 'Retrait non trouvé' };
      }

      const withdrawal = withdrawalRes.rows[0];
      const isPartner = withdrawal.source_type === 'PARTENAIRE' || !!withdrawal.partenaire_id;
      const partnerId = withdrawal.partenaire_id || withdrawal.user_id;

      if (withdrawal.status === 'COMPLETED') {
        await client.query('COMMIT');
        return { applied: false, code: 'IGNORED', message: 'Retrait déjà complété' };
      }

      if (withdrawal.status === 'REJECTED') {
        await client.query('COMMIT');
        return { applied: false, code: 'IGNORED', message: 'Retrait déjà rejeté' };
      }

      if (isSuccess && withdrawal.status !== 'COMPLETED') {
        // 1. Retrait COMPLETED
        await client.query(
          `UPDATE withdrawals
           SET status = $1, admin_note = $2, updated_at = NOW()
           WHERE id = $3`,
          ['COMPLETED', `Nokash Payout confirmé (ID: ${id})`, withdrawal.id]
        );

        // 2. Transaction rattachée -> SUCCESS (utilisateurs uniquement)
        if (!isPartner) {
          await client.query(
            `UPDATE transactions SET status = 'SUCCESS', updated_at = NOW()
             WHERE user_id = $1 AND type = 'withdrawal' AND (metadata->>'withdrawalId' = $2 OR id::text = $2)`,
            [withdrawal.user_id, withdrawal.id]
          );
        }

        await client.query('COMMIT');

        const completedNotif = {
          type: 'WITHDRAWAL_COMPLETED',
          title: 'Retrait Confirmé 💸',
          message: `Votre virement de ${withdrawal.amount} XAF vers le ${withdrawal.payment_details} a été validé avec succès sur votre compte Mobile Money.`,
          metadata: { nokashId: id, withdrawalId: withdrawal.id },
        };
        if (isPartner) {
          notificationService
            .createNotification({
              destinataire_type: 'PARTENAIRE',
              destinataire_id: partnerId,
              ...completedNotif,
            })
            .catch(() => {});
        } else {
          notificationService
            .createNotification({ user_id: withdrawal.user_id, ...completedNotif })
            .catch(() => {});
        }

        notificationService
          .notifyAdmins(
            'Retrait Payout Confirmé',
            `Le virement de ${withdrawal.amount} XAF vers ${withdrawal.payment_details} a été confirmé par l'opérateur (Réf: ${id}).`,
            'INFO'
          )
          .catch(() => {});

        console.log(
          `✅ [Withdrawal Settlement] Retrait ${withdrawal.id} COMPLETED (Nokash ID: ${id})`
        );
        return { applied: true, code: 'COMPLETED', message: 'Retrait complété' };
      }

      if (isFailed && withdrawal.status !== 'REJECTED') {
        const amountToRefund = Number(withdrawal.amount);

        if (isPartner) {
          // 1. Lock et remboursement automatique du wallet partenaire
          const partnerRes = await client.query(
            'SELECT wallet_balance FROM partenaires WHERE id = $1 FOR UPDATE',
            [partnerId]
          );
          if (partnerRes.rows.length === 0) {
            throw new Error('Partenaire introuvable pour le remboursement du retrait');
          }
          const balanceBefore = parseFloat(partnerRes.rows[0]?.wallet_balance || '0');
          const balanceAfter = balanceBefore + amountToRefund;

          await client.query('UPDATE partenaires SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [
            balanceAfter,
            partnerId,
          ]);

          // 2. Trace du remboursement dans partenaire_wallet_transactions
          await client.query(
            `INSERT INTO partenaire_wallet_transactions
             (partenaire_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
             VALUES ($1, $2, $3, $4, 'CREDIT', 'WITHDRAWAL', $5, 'withdrawal', $6)`,
            [
              partnerId,
              amountToRefund,
              balanceBefore,
              balanceAfter,
              withdrawal.id,
              JSON.stringify({ nokashId: id, refund: true, reason: normalizedStatus }),
            ]
          );
        } else {
          // 1. Lock et remboursement automatique du solde utilisateur
          const userRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [
            withdrawal.user_id,
          ]);
          const balanceBefore = parseFloat(userRes.rows[0]?.wallet_balance || '0');
          const balanceAfter = balanceBefore + amountToRefund;

          await client.query('UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2', [
            balanceAfter,
            withdrawal.user_id,
          ]);

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
              JSON.stringify({ nokashId: id, refund: true, reason: normalizedStatus }),
            ]
          );
        }

        // 3. Retrait -> REJECTED
        await client.query(
          `UPDATE withdrawals
           SET status = $1, admin_note = $2, updated_at = NOW()
           WHERE id = $3`,
          ['REJECTED', `Échec Payout Nokash: ${normalizedStatus} (Fonds recrédités)`, withdrawal.id]
        );

        // 4. Transaction -> FAILED (utilisateurs uniquement)
        if (!isPartner) {
          await client.query(
            `UPDATE transactions SET status = 'FAILED', updated_at = NOW()
             WHERE user_id = $1 AND type = 'withdrawal' AND (metadata->>'withdrawalId' = $2 OR id::text = $2)`,
            [withdrawal.user_id, withdrawal.id]
          );
        }

        await client.query('COMMIT');

        const failedNotif = {
          type: 'WITHDRAWAL_FAILED',
          title: 'Échec du Retrait & Fonds Recrédités 🔄',
          message: `Le virement de ${withdrawal.amount} XAF vers le ${withdrawal.payment_details} n'a pas pu aboutir (${normalizedStatus}). Le montant a été automatiquement recrédité sur votre solde.`,
          metadata: { nokashId: id, withdrawalId: withdrawal.id },
        };
        if (isPartner) {
          notificationService
            .createNotification({
              destinataire_type: 'PARTENAIRE',
              destinataire_id: partnerId,
              ...failedNotif,
            })
            .catch(() => {});
        } else {
          notificationService
            .createNotification({ user_id: withdrawal.user_id, ...failedNotif })
            .catch(() => {});
        }

        notificationService
          .notifyAdmins(
            'Échec Retrait Payout & Remboursement',
            `Le virement de ${withdrawal.amount} XAF vers ${withdrawal.payment_details} a échoué (${normalizedStatus}, Réf: ${id}). Le client a été remboursé.`,
            'ALERT'
          )
          .catch(() => {});

        console.warn(
          `❌ [Withdrawal Settlement] Retrait ${withdrawal.id} REJECTED & REFUNDED (${normalizedStatus})`
        );
        return { applied: true, code: 'REJECTED', message: 'Retrait rejeté et remboursé' };
      }

      await client.query('COMMIT');
      return { applied: false, code: 'IGNORED', message: `Statut ${normalizedStatus || 'inconnu'} ignoré` };
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('❌ [Withdrawal Settlement Transaction Error]:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export const withdrawalSettlementService = new WithdrawalSettlementService();
