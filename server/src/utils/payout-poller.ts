import { pool } from '../database/db.ts';
import { nokashPayoutService } from '../services/nokash-payout.service.ts';
import { withdrawalSettlementService } from '../services/withdrawal-settlement.service.ts';

/**
 * Payout Poller — réconciliation des retraits en attente.
 *
 * Exécuté toutes les 2 minutes par le cron.
 * Cherche les retraits PROCESSING :
 *   - avec un ID Nokash dans admin_note (payout déjà initié)
 *   - depuis plus de 2 minutes (laisse le temps au callback d'arriver)
 *   - depuis moins de 24 h (évite de polluer avec de vieux retraits bloqués)
 *
 * Pour chaque retrait trouvé, il interroge l'API Nokash sur le statut,
 * puis délègue la finalisation (débit wallet, COMPLETED/REJECTED) à
 * withdrawalSettlementService.applyNokashPayoutResult — idempotent.
 */
class PayoutPollerService {
  private isRunning = false;

  async pollPendingPayouts(): Promise<void> {
    // Empêche les exécutions parallèles si un cycle est déjà en cours
    if (this.isRunning) {
      console.log('⏩ [Payout Poller] Cycle déjà en cours — sauté.');
      return;
    }

    this.isRunning = true;

    try {
      // ─── 1. Retraits PROCESSING initiés il y a entre 2 min et 24 h ───────────
      const { rows: pendingWithdrawals } = await pool.query<{
        id: string;
        admin_note: string | null;
        amount: string;
        payment_details: string;
        created_at: Date;
      }>(
        `SELECT id, admin_note, amount, payment_details, created_at
         FROM withdrawals
         WHERE status = 'PROCESSING'
           AND created_at < NOW() - INTERVAL '2 minutes'
           AND created_at > NOW() - INTERVAL '24 hours'
         ORDER BY created_at ASC
         LIMIT 20`
      );

      // ─── 2. 🔒 SECURITY: Retraits PROCESSING orphelins (sans ID Nokash depuis
      //        plus de 15 min) → remboursement automatique pour débloquer l'user
      const { rows: orphanedWithdrawals } = await pool.query<{
        id: string;
        user_id: string;
        amount: string;
        admin_note: string | null;
        created_at: Date;
      }>(
        `SELECT id, user_id, amount, admin_note, created_at
         FROM withdrawals
         WHERE status = 'PROCESSING'
           AND created_at < NOW() - INTERVAL '15 minutes'
           AND (admin_note IS NULL OR admin_note NOT ILIKE '%ID:%')
         LIMIT 10`
      );

      if (orphanedWithdrawals.length > 0) {
        console.warn(`⚠️ [Payout Poller] ${orphanedWithdrawals.length} retrait(s) PROCESSING orphelin(s) détectés → remboursement automatique.`);

        for (const orphan of orphanedWithdrawals) {
          try {
            await withdrawalSettlementService.applyNokashPayoutResult(orphan.id, {
              status: 'FAILED',
              id: undefined,
              phone: undefined,
            });
            console.warn(`🔄 [Payout Poller] Retrait orphelin ${orphan.id} remboursé automatiquement.`);
          } catch (oErr: any) {
            console.error(`❌ [Payout Poller] Échec remboursement orphelin ${orphan.id}:`, oErr?.message);
          }
        }
      }

      // ─── 3. Retraits PROCESSING trop anciens (> 24h) → force REJECTED + refund
      const { rows: staleWithdrawals } = await pool.query<{
        id: string;
        user_id: string;
        amount: string;
      }>(
        `SELECT id, user_id, amount
         FROM withdrawals
         WHERE status = 'PROCESSING'
           AND created_at < NOW() - INTERVAL '24 hours'
         LIMIT 10`
      );

      if (staleWithdrawals.length > 0) {
        console.warn(`⚠️ [Payout Poller] ${staleWithdrawals.length} retrait(s) PROCESSING trop anciens (>24h) → forçage REJECTED.`);
        for (const stale of staleWithdrawals) {
          try {
            await withdrawalSettlementService.applyNokashPayoutResult(stale.id, {
              status: 'TIMEOUT',
              id: undefined,
              phone: undefined,
            });
            console.warn(`🔄 [Payout Poller] Retrait expiré ${stale.id} forcé REJECTED et remboursé.`);
          } catch (sErr: any) {
            console.error(`❌ [Payout Poller] Échec forçage retrait expiré ${stale.id}:`, sErr?.message);
          }
        }
      }

      if (pendingWithdrawals.length === 0) {
        return; // rien à faire, pas de log pour ne pas spammer
      }

      console.log(`🔄 [Payout Poller] ${pendingWithdrawals.length} retrait(s) PROCESSING à vérifier...`);

      for (const withdrawal of pendingWithdrawals) {
        try {
          const match = withdrawal.admin_note?.match(/ID:\s*([0-9a-zA-Z]{10,64})/i);
          const nokashId = match ? match[1] : null;

          if (!nokashId) {
            continue;
          }

          console.log(
            `🔍 [Payout Poller] Vérification retrait ${withdrawal.id} (nokash_id: ${nokashId})`
          );

          const statusRes = await nokashPayoutService.checkPayoutStatus(nokashId);

          // statusRes.data contient { status, id, orderId, phone, ... }
          const nokashData = statusRes?.data ?? {};
          const nokashStatus: string = (nokashData.status ?? statusRes?.status ?? '').toString().toUpperCase();

          console.log(
            `📊 [Payout Poller] Retrait ${withdrawal.id} → Nokash status: ${nokashStatus}`
          );

          if (!nokashStatus || nokashStatus === 'PENDING') {
            // Toujours en attente — on réessaiera au prochain cycle
            continue;
          }

          // Applique le résultat (COMPLETED / REJECTED / IGNORED)
          const result = await withdrawalSettlementService.applyNokashPayoutResult(withdrawal.id, {
            status: nokashStatus,
            id: nokashData.id ?? nokashId,
            phone: nokashData.phone,
          });

          console.log(
            `✅ [Payout Poller] Retrait ${withdrawal.id} → ${result.code}: ${result.message}`
          );
        } catch (err: any) {
          // Une erreur sur un retrait ne doit pas bloquer les autres
          console.error(
            `❌ [Payout Poller] Erreur sur retrait ${withdrawal.id}:`,
            err?.message ?? err
          );
        }
      }
    } catch (err: any) {
      console.error('❌ [Payout Poller] Erreur générale du cycle:', err?.message ?? err);
    } finally {
      this.isRunning = false;
    }
  }
}

export const payoutPollerService = new PayoutPollerService();
