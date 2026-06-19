import { Router } from 'express';
import { SmsController } from '../controllers/sms.controller.ts';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const smsController = new SmsController();

// All routes here require admin authentication
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/balance', (req, res) => smsController.getBalance(req, res));
router.get('/usage', (req, res) => smsController.getUsage(req, res));
router.get('/purchase-history', (req, res) => smsController.getPurchaseHistory(req, res));
router.post('/send', (req, res) => smsController.sendSms(req, res));

export default router;
