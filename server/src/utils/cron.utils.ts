import cron from 'node-cron';
import { matchingService } from '../services/matching.service.ts';
import { expirationService } from '../services/expiration.service.ts';
import { paymentReconciliationService } from '../services/payment-reconciliation.service.ts';
import { payoutPollerService } from './payout-poller.ts';
import { storageCleanupService } from '../services/storage-cleanup.service.ts';
import { TIMING } from '../config/timing.ts';

/**
 * Initialize all background cron jobs
 */
export const initCronJobs = () => {
  console.log('👷 Initializing Background Cron Jobs...');

  // Launch one initial matching cycle immediately as requested
  console.log('🚀 [STARTUP] Launching immediate matching cycle...');
  matchingService.runFullMatchingCycle().catch(err => console.error('❌ Error during startup matching:', err));

  // 1. Matching Worker - Runs every 30 seconds
  cron.schedule(TIMING.matchingCron, () => {
    matchingService.runFullMatchingCycle();
  });

  // 2. Expiration Reminder - Runs daily at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    console.log('⏰ Running expiration reminder check...');
    expirationService.checkAndRemind();
  });

  // 3. Auto-Archive Expired Documents - Runs daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    console.log('📦 Running expired document archiving...');
    expirationService.checkAndArchive();
  });

  // 4. Payment Reconciliation (payin) - Runs every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    console.log('🔄 Running payment reconciliation...');
    paymentReconciliationService.reconcileStuckTransactions();
  });

  // 5. Payout Poller (retrait) - Runs every 2 minutes
  //    Vérifie les retraits PROCESSING avec un nokash_id et les finalise
  //    sans dépendre du callback Nokash.
  cron.schedule('*/2 * * * *', () => {
    payoutPollerService.pollPendingPayouts();
  });

  // 6. Storage Cleanup - Runs daily at 3:00 AM
  //    Supprime les photos/pèces non référencées en base après la rétention.
  cron.schedule('0 3 * * *', () => {
    console.log('🧹 Running orphan uploads cleanup...');
    storageCleanupService.purgeOrphanFiles().catch((err) =>
      console.error('❌ Storage cleanup failed:', err),
    );
  });

  console.log('✅ Background Cron Jobs scheduled (matching: 30s, payout-poll: 2min, reconciliation: 15min, expiration: daily, storage-cleanup: 3AM).');
};
