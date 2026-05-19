import { Router } from 'express';
import { 
  getAllSubscriptions, 
  getAdminStats, 
  updateSubscriptionStatus,
  getUserUsage
} from '../controllers/subscription.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { subscriptionService } from '../services/subscription.service.ts';

const router = Router();

const adminMiddleware = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: "Accès refusé. Droits administrateur requis." });
    }
};

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Gestion des abonnements et limites
 */

/**
 * @swagger
 * /subscriptions/usage:
 *   get:
 *     summary: Récupérer l'utilisation et les limites de l'abonnement
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Détails d'usage récupérés
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { active: true, plan: "Pro", objects_count: 2, objects_limit: 5 }
 */
router.get('/usage', authMiddleware, getUserUsage);
router.get('/my-subscription', authMiddleware, getUserUsage);

/**
 * @swagger
 * /subscriptions/subscribe:
 *   post:
 *     summary: Souscrire à un nouveau plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planId, months, paymentMethod]
 *             properties:
 *               planId: { type: string, example: "premium" }
 *               months: { type: number, example: 12 }
 *               paymentMethod: { type: string, example: "MOBILE_MONEY" }
 *               phone: { type: string, example: "677000000" }
 *     responses:
 *       201:
 *         description: Souscription initiée
 */
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
        const statusCode = error.message.includes('Nokash:') ? 400 : 500;
        const cleanMessage = error.message.replace('Nokash: ', '');
        res.status(statusCode).json({ success: false, message: cleanMessage });
    }
});

// Admin routes
router.get('/admin/stats', authMiddleware, adminMiddleware, getAdminStats);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllSubscriptions);
router.patch('/admin/:id/status', authMiddleware, adminMiddleware, updateSubscriptionStatus);

export default router;
