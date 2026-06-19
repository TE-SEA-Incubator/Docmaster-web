import cron from 'node-cron';
import { matchingService } from '../services/matching.service.ts';

/**
 * Initialize all background cron jobs
 */
export const initCronJobs = () => {
  console.log('👷 Initializing Background Cron Jobs...');

  // Launch one initial matching cycle immediately as requested
  console.log('🚀 [STARTUP] Launching immediate matching cycle...');
  matchingService.runFullMatchingCycle().catch(err => console.error('❌ Error during startup matching:', err));

  // 1. Matching Worker - Runs every 30 seconds
  // Syntax: second minute hour day-of-month month day-of-week
  cron.schedule('*/30 * * * * *', () => {
    matchingService.runFullMatchingCycle();
  });

  console.log('✅ Background Cron Jobs scheduled (every 30s).');
};
