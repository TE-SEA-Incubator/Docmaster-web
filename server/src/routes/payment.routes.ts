import { Router } from 'express';
import { nokashCallback, getMyTransactions, getAllTransactions, payRecovery } from '../controllers/payment.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

/**
 * @route POST /api/payments/pay-recovery
 * @desc Process payment for document recovery
 */
router.post('/pay-recovery', authMiddleware, payRecovery);

/**
 * @route POST /api/payments/nokash/callback
 * @desc Webhook for Nokash payment status updates
 */
router.post('/nokash/callback', nokashCallback);

/**
 * @route GET /api/payments/my-history
 * @desc Get current user's transaction history
 */
router.get('/my-history', authMiddleware, getMyTransactions);

/**
 * @route GET /api/payments/admin/all
 * @desc Get all transactions for admin
 */
router.get('/admin/all', authMiddleware, getAllTransactions);

export default router;
