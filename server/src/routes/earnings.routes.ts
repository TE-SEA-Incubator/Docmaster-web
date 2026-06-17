import { Router } from 'express';
import { EarningsController } from '../controllers/earnings.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const earningsController = new EarningsController();

/**
 * @swagger
 * tags:
 *   name: Earnings
 *   description: Gestion des gains et historique des revenus
 */

router.use(authMiddleware);

/**
 * @swagger
 * /earnings:
 *   get:
 *     summary: Récupérer l'historique des gains de l'utilisateur
 *     tags: [Earnings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Nombre maximal de résultats à retourner
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Décalage pour la pagination
 *     responses:
 *       200:
 *         description: Historique des gains récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EarningsEntry'
 *                 total:
 *                   type: integer
 *                   description: Nombre total d'entrées
 *                   example: 12
 *                 limit:
 *                   type: integer
 *                   example: 50
 *                 offset:
 *                   type: integer
 *                   example: 0
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/', earningsController.getMyEarnings);

export default router;
