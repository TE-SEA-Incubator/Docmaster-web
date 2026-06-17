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
/**
 * @swagger
 * /subscriptions/my-subscription:
 *   get:
 *     summary: Récupérer mon abonnement actif (alias de /usage)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Détails de l'abonnement utilisateur
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 active: true
 *                 plan: "Pro"
 *                 objects_count: 2
 *                 objects_limit: 5
 *                 expiry_date: "2025-12-31T23:59:59Z"
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
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
        const statusCode = (error.status === 400 || error.message.includes('Nokash:')) ? 400 : 500;
        const cleanMessage = error.message.replace('Nokash: ', '');
        res.status(statusCode).json({ success: false, message: cleanMessage });
    }
});

/**
 * @swagger
 * /subscriptions/admin/stats:
 *   get:
 *     summary: Statistiques globales des abonnements (Admin)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 total_subscriptions: 150
 *                 active: 120
 *                 expired: 30
 *                 revenue_total: 1500000
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/admin/stats', authMiddleware, adminMiddleware, getAdminStats);

/**
 * @swagger
 * /subscriptions/admin/all:
 *   get:
 *     summary: Lister tous les abonnements (Admin)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des abonnements
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   user_id: "uuid"
 *                   plan_name: "Pro"
 *                   status: "ACTIVE"
 *                   expiry_date: "2025-12-31T23:59:59Z"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/admin/all', authMiddleware, adminMiddleware, getAllSubscriptions);

/**
 * @swagger
 * /subscriptions/admin/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut d'un abonnement (Admin)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de l'abonnement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACTIVE, CANCELLED, EXPIRED, SUSPENDED] }
 *               admin_comment: { type: string, example: "Abonnement suspendu pour non-paiement" }
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", status: "SUSPENDED" }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Abonnement introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch('/admin/:id/status', authMiddleware, adminMiddleware, updateSubscriptionStatus);

export default router;
