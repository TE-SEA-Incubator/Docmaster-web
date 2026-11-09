import { query } from '../database/db.ts';
import { nokashService } from './nokash.service.ts';
import { getSharePayService } from './sharepay.service.ts';
import { subscriptionService } from './subscription.service.ts';
import { activateRecovery } from '../controllers/payment.controller.ts';
import { releaseReservationByTransaction } from '../utils/recovery.utils.ts';

function normalizeNokashStatus(payload: any) {
  const status = (payload?.status || payload?.data?.status || payload?.result?.status || '').toString().toUpperCase();
  return {
    status,
    success: ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'COMPLETED'].includes(status),
    terminal: ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'COMPLETED', 'FAILED', 'CANCELED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(status),
  };
}

class PaymentReconciliationService {
  /**
   * Mark stale PENDING transactions as EXPIRED instead of deleting (preserves audit trail)
   */
  async cleanupStaleTransactions() {
    try {
      const result = await query(
        `UPDATE transactions
         SET status = 'EXPIRED'
         WHERE status = 'PENDING'
           AND created_at < NOW() - INTERVAL '2 days'
         RETURNING id, type, amount, user_id`
      );
      if (result.rows.length > 0) {
        console.log(`[Reconciliation] Expiré ${result.rows.length} transaction(s) PENDING de +2 jours`);
      }
      return result.rows.length;
    } catch (err) {
      console.error('[Reconciliation] Error cleaning stale transactions:', err);
      return 0;
    }
  }

  async reconcileStuckTransactions() {
    await this.cleanupStaleTransactions();
    console.log('[Reconciliation] Checking stuck PENDING transactions...');

    try {
      const result = await query(
        `SELECT * FROM transactions 
         WHERE status = 'PENDING' 
           AND type IN ('subscription', 'recovery_fee', 'points_purchase')
           AND created_at < NOW() - INTERVAL '15 minutes'
         ORDER BY created_at ASC
         LIMIT 20`
      );

      if (result.rows.length === 0) {
        console.log('[Reconciliation] No stuck transactions found.');
        return;
      }

      console.log(`[Reconciliation] Found ${result.rows.length} stuck transaction(s).`);

      for (const transaction of result.rows) {
        try {
          const externalRef = transaction.external_ref;
          if (!externalRef) {
            console.warn(`[Reconciliation] Transaction ${transaction.id} has no external_ref, marking as FAILED`);
            await query('UPDATE transactions SET status = $1 WHERE id = $2', ['FAILED', transaction.id]);
            continue;
          }

          let metadata = transaction.metadata;
          if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch (e) {
              console.error('[Reconciliation] Metadata parse error:', e);
              continue;
            }
          }
          const isSharePay = metadata?.provider === 'SHAREPAY';

          const statusRes = isSharePay
            ? await getSharePayService().getPayInStatus(externalRef)
            : await nokashService.checkStatus(externalRef);
          const normalized = normalizeNokashStatus(statusRes);

          console.log(`[Reconciliation] Transaction ${transaction.id} (${externalRef}, ${isSharePay ? 'SHAREPAY' : 'NOKASH'}) -> ${normalized.status}`);

          if (normalized.success) {
            const locked = await query(
              'UPDATE transactions SET status = $1 WHERE id = $2 AND status = $3 RETURNING *',
              ['SUCCESS', transaction.id, 'PENDING']
            );
            if (locked.rows.length === 0) continue;

            if (transaction.type === 'subscription') {
              const { planId, months } = metadata || {};
              if (planId) {
                await subscriptionService.activateSubscription(transaction.user_id, planId, months || 1);
                console.log(`[Reconciliation] Subscription activated for user ${transaction.user_id}`);
              }
            } else if (transaction.type === 'recovery_fee') {
              const { docId, matchId, foundId, reservationId } = metadata || {};
              if (docId) {
                try {
                  await activateRecovery(transaction.user_id, docId, transaction.id, {
                    matchId,
                    foundId,
                    reservationId,
                  });
                } catch (activationErr) {
                  await query(
                    `UPDATE transactions SET status = 'PENDING'
                     WHERE id = $1 AND status = 'SUCCESS' AND type = 'recovery_fee'`,
                    [transaction.id],
                  );
                  throw activationErr;
                }
              }
            } else if (transaction.type === 'points_purchase') {
              const { pointsAmount } = metadata || {};
              if (pointsAmount) {
                await query('UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2', [pointsAmount, transaction.user_id]);
                await query(
                  `INSERT INTO earnings_history (user_id, type, amount, currency, description, metadata)
                   VALUES ($1, 'POINTS_PURCHASE', $2, 'POINTS', $3, $4)`,
                  [transaction.user_id, pointsAmount, `Achat de ${pointsAmount} points`, JSON.stringify({ transactionId: transaction.id, provider: metadata.provider })]
                );
                console.log(`[Reconciliation] Points credited: ${pointsAmount} to user ${transaction.user_id}`);
              }
            }
          } else if (normalized.terminal) {
            const terminalStatus = normalized.status === 'CANCELLED' ? 'CANCELED' : normalized.status;
            await query('UPDATE transactions SET status = $1 WHERE id = $2', [terminalStatus, transaction.id]);
            await releaseReservationByTransaction(transaction.id);
            console.log(`[Reconciliation] Transaction ${transaction.id} marked as ${terminalStatus}`);
          } else {
            console.log(`[Reconciliation] Transaction ${transaction.id} still pending at Nokash, skipping.`);
          }
        } catch (err) {
          console.error(`[Reconciliation] Error processing transaction ${transaction.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[Reconciliation] Error:', err);
    }
  }

  async forceCheckTransaction(externalRef: string) {
    const result = await query(
      'SELECT * FROM transactions WHERE external_ref = $1 LIMIT 1',
      [externalRef]
    );

    if (result.rows.length === 0) {
      return { found: false };
    }

    const transaction = result.rows[0];

    if (transaction.status !== 'PENDING') {
      return { found: true, updated: false, reason: `Transaction déjà en statut ${transaction.status}` };
    }

    let metadata = transaction.metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch (e) {}
    }
    const isSharePay = metadata?.provider === 'SHAREPAY';

    const statusRes = isSharePay
      ? await getSharePayService().getPayInStatus(externalRef)
      : await nokashService.checkStatus(externalRef);
    const normalized = normalizeNokashStatus(statusRes);

    if (normalized.success) {
      const locked = await query(
        'UPDATE transactions SET status = $1 WHERE id = $2 AND status = $3 RETURNING *',
        ['SUCCESS', transaction.id, 'PENDING']
      );
      if (locked.rows.length === 0) {
        return { found: true, updated: false, reason: 'Transaction déjà traitée' };
      }

      if (transaction.type === 'subscription') {
        const { planId, months } = metadata || {};
        if (planId) {
          await subscriptionService.activateSubscription(transaction.user_id, planId, months || 1);
        }
      } else if (transaction.type === 'recovery_fee') {
        const { docId, matchId, foundId, reservationId } = metadata || {};
        if (docId) {
          try {
            await activateRecovery(transaction.user_id, docId, transaction.id, {
              matchId,
              foundId,
              reservationId,
            });
          } catch (activationErr) {
            await query(
              `UPDATE transactions SET status = 'PENDING'
               WHERE id = $1 AND status = 'SUCCESS' AND type = 'recovery_fee'`,
              [transaction.id],
            );
            throw activationErr;
          }
        }
      } else if (transaction.type === 'points_purchase') {
        const { pointsAmount } = metadata || {};
        if (pointsAmount) {
          await query('UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2', [pointsAmount, transaction.user_id]);
          await query(
            `INSERT INTO earnings_history (user_id, type, amount, currency, description, metadata)
             VALUES ($1, 'POINTS_PURCHASE', $2, 'POINTS', $3, $4)`,
            [transaction.user_id, pointsAmount, `Achat de ${pointsAmount} points`, JSON.stringify({ transactionId: transaction.id, provider: metadata.provider })]
          );
        }
      }

      return { found: true, updated: true, status: 'SUCCESS' };
    } else if (normalized.terminal) {
      const terminalStatus = normalized.status === 'CANCELLED' ? 'CANCELED' : normalized.status;
      await query('UPDATE transactions SET status = $1 WHERE id = $2', [terminalStatus, transaction.id]);
      await releaseReservationByTransaction(transaction.id);
      return { found: true, updated: true, status: terminalStatus };
    }

    return { found: true, updated: false, reason: `${isSharePay ? 'SharePay' : 'Nokash'} status: ${normalized.status || 'unknown'}` };
  }
}

export const paymentReconciliationService = new PaymentReconciliationService();
