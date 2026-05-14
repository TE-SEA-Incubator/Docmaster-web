import { Router } from 'express';
import { WithdrawalController } from '../controllers/withdrawal.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const controller = new WithdrawalController();

router.post('/request', authMiddleware, controller.requestWithdrawal);
router.get('/my-requests', authMiddleware, controller.getMyWithdrawals);

// Admin routes (should be protected by admin middleware, but for now we'll just add them)
router.get('/admin/pending', authMiddleware, controller.getAllPendingWithdrawals);
router.post('/admin/approve/:id', authMiddleware, controller.approveWithdrawal);
router.post('/admin/reject/:id', authMiddleware, controller.rejectWithdrawal);

export default router;
