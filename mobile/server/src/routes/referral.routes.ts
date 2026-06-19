import { Router } from 'express';
import { ReferralController } from '../controllers/referral.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const referralController = new ReferralController();

/**
 * @swagger
 * tags:
 *   name: Referrals
 *   description: Gestion du parrainage et des invitations
 */

/**
 * @swagger
 * /referrals:
 *   get:
 *     summary: Liste de mes filleuls et statistiques
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { referrals: [], total_earned: 5000, points: 200 }
 */
router.get('/', authMiddleware, (req, res) => referralController.getMyReferrals(req, res));

// Admin routes
router.get('/admin', authMiddleware, (req, res) => referralController.getAllReferrals(req, res));
router.patch('/admin/:id/reward', authMiddleware, (req, res) => referralController.rewardReferral(req, res));

export default router;
