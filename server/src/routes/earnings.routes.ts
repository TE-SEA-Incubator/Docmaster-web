import { Router } from 'express';
import { EarningsController } from '../controllers/earnings.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const earningsController = new EarningsController();

router.use(authMiddleware);

router.get('/', earningsController.getMyEarnings);

export default router;
