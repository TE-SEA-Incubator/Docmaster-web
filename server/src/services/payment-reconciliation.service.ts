import { query } from '../database/db.ts';
import { nokashService } from './nokash.service.ts';
import { subscriptionService } from './subscription.service.ts';

function normalizeNokashStatus(payload: any) {
  const status = (payload?.status || payload?.data?.status || payload?.result?.status || '').toString().toUpperCase();
  return {
    status,
    success: ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'COMPLETED'].includes(status),
    terminal: ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'COMPLETED', 'FAILED', 'CANCELED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(status),
  };
}

async function activateRecovery(userId: string, docId: string, transactionId: string) {
  try {
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

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

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

    await query('UPDATE declarations SET payment_status = $1, status = $2 WHERE id = $3', ['PAID', 'MATCHED', docId]);

    console.log(`[Reconciliation] Recovery activated for doc ${docId}`);
  } catch (err) {
    console.error('[Reconciliation] Error activating recovery:', err);
  }
}

class PaymentReconciliationService {
  async reconcileStuckTransactions() {
    console.log('[Reconciliation] Checking stuck PENDING transactions...');

    try {
      const result = await query(
        `SELECT * FROM transactions 
         WHERE status = 'PENDING' 
           AND type IN ('subscription', 'recovery_fee')
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

          const statusRes = await nokashService.checkStatus(externalRef);
          const normalized = normalizeNokashStatus(statusRes);

          console.log(`[Reconciliation] Transaction ${transaction.id} (${externalRef}) -> ${normalized.status}`);

          if (normalized.success) {
            await query('UPDATE transactions SET status = $1 WHERE id = $2', ['SUCCESS', transaction.id]);

            let metadata = transaction.metadata;
            if (typeof metadata === 'string') {
              try { metadata = JSON.parse(metadata); } catch (e) {
                console.error('[Reconciliation] Metadata parse error:', e);
                continue;
              }
            }

            if (transaction.type === 'subscription') {
              const { planId, months } = metadata || {};
              if (planId) {
                await subscriptionService.activateSubscription(transaction.user_id, planId, months || 1);
                console.log(`[Reconciliation] Subscription activated for user ${transaction.user_id}`);
              }
            } else if (transaction.type === 'recovery_fee') {
              const { docId } = metadata || {};
              if (docId) {
                await activateRecovery(transaction.user_id, docId, transaction.id);
              }
            }
          } else if (normalized.terminal) {
            const terminalStatus = normalized.status === 'CANCELLED' ? 'CANCELED' : normalized.status;
            await query('UPDATE transactions SET status = $1 WHERE id = $2', [terminalStatus, transaction.id]);
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

    const statusRes = await nokashService.checkStatus(externalRef);
    const normalized = normalizeNokashStatus(statusRes);

    if (normalized.success) {
      await query('UPDATE transactions SET status = $1 WHERE id = $2', ['SUCCESS', transaction.id]);

      let metadata = transaction.metadata;
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch (e) {}
      }

      if (transaction.type === 'subscription') {
        const { planId, months } = metadata || {};
        if (planId) {
          await subscriptionService.activateSubscription(transaction.user_id, planId, months || 1);
        }
      } else if (transaction.type === 'recovery_fee') {
        const { docId } = metadata || {};
        if (docId) {
          await activateRecovery(transaction.user_id, docId, transaction.id);
        }
      }

      return { found: true, updated: true, status: 'SUCCESS' };
    } else if (normalized.terminal) {
      const terminalStatus = normalized.status === 'CANCELLED' ? 'CANCELED' : normalized.status;
      await query('UPDATE transactions SET status = $1 WHERE id = $2', [terminalStatus, transaction.id]);
      return { found: true, updated: true, status: terminalStatus };
    }

    return { found: true, updated: false, reason: `Nokash status: ${normalized.status || 'unknown'}` };
  }
}

export const paymentReconciliationService = new PaymentReconciliationService();
