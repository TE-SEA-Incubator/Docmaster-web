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

/**
 * @swagger
 * /referrals/admin:
 *   get:
 *     summary: Lister tous les parrainages (Admin)
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de tous les parrainages
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 referrals:
 *                   - id: "uuid"
 *                     referrer_id: "uuid"
 *                     referred_id: "uuid"
 *                     status: "ACTIVE"
 *                     reward: 50
 *                     created_at: "2024-06-15T10:00:00Z"
 *                 total_count: 150
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/admin', authMiddleware, (req, res) => referralController.getAllReferrals(req, res));

/**
 * @swagger
 * /referrals/admin/{id}/reward:
 *   patch:
 *     summary: Attribuer la récompense à un parrainage (Admin)
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID du parrainage
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reward: { type: number, example: 100, description: "Montant de la récompense en points" }
 *               admin_comment: { type: string, example: "Récompense attribuée après vérification" }
 *     responses:
 *       200:
 *         description: Récompense attribuée avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Récompense attribuée avec succès"
 *               data: { id: "uuid", reward: 100, status: "REWARDED" }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Parrainage introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch('/admin/:id/reward', authMiddleware, (req, res) => referralController.rewardReferral(req, res));

export default router;
