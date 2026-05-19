import { Router } from 'express';
import { 
  getAllPlans,
  getPlanById, 
  updatePlan, 
  createPlan,
  getFeatureDefinitions
} from '../controllers/plan.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

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
 *   name: Plans
 *   description: Gestion des forfaits d'abonnement
 */

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Lister tous les forfaits disponibles
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: [{ id: "premium", name: "Premium", price_monthly: 1000 }]
 */
router.get('/', getAllPlans);

// Admin routes
router.get('/:id', authMiddleware, adminMiddleware, getPlanById);
router.get('/features/definitions', authMiddleware, adminMiddleware, getFeatureDefinitions);
router.put('/:id', authMiddleware, adminMiddleware, updatePlan);
router.post('/', authMiddleware, adminMiddleware, createPlan);

export default router;
