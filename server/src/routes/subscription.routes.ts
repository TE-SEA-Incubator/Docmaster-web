import { Router } from 'express';
import { 
  getAllSubscriptions, 
  getAdminStats, 
  updateSubscriptionStatus,
  getUserUsage
} from '../controllers/subscription.controller.ts';
import { subscriptionRepository } from '../repositories/subscription.repository.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { subscriptionService } from '../services/subscription.service.ts';

const router = Router();

// Middleware de vérification admin à ajouter ici si nécessaire
const adminMiddleware = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: "Accès refusé. Droits administrateur requis." });
    }
};

router.get('/admin/stats', authMiddleware, adminMiddleware, getAdminStats);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllSubscriptions);
router.patch('/admin/:id/status', authMiddleware, adminMiddleware, updateSubscriptionStatus);

// User routes
/**
 * @route GET /api/subscriptions/usage
 * @desc Get current user's active subscription and usage stats
 */
router.get('/usage', authMiddleware, getUserUsage);

/**
 * @route GET /api/subscriptions/my-subscription (LEGACY/BACKWARD COMPAT)
 * @desc Redirect to usage or keep for simple sub data
 */
router.get('/my-subscription', authMiddleware, getUserUsage);
router.post('/subscribe', authMiddleware, async (req: any, res: any) => {
    try {
        const { planId, months, paymentMethod, phone } = req.body;
        const userId = req.user.id;
        
        const sub = await subscriptionService.subscribeUser(userId, planId, months, { 
            method: paymentMethod,
            phone: phone
        });

        res.status(201).json({ success: true, data: sub });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
