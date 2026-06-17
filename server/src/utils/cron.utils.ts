import cron from 'node-cron';
import { matchingService } from '../services/matching.service.ts';
import { expirationService } from '../services/expiration.service.ts';

/**
 * Initialize all background cron jobs
 */
export const initCronJobs = () => {
  console.log('👷 Initializing Background Cron Jobs...');

  // Launch one initial matching cycle immediately as requested
  console.log('🚀 [STARTUP] Launching immediate matching cycle...');
  matchingService.runFullMatchingCycle().catch(err => console.error('❌ Error during startup matching:', err));

  // 1. Matching Worker - Runs every 30 seconds
  cron.schedule('*/30 * * * * *', () => {
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

  console.log('✅ Background Cron Jobs scheduled (matching: 30s, expiration: daily).');
};
