import { Router } from 'express';
import { getPointsRate, convertPoints } from '../controllers/points.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Points
 *   description: Gestion des points et conversion
 */

/**
 * @swagger
 * /points/rate:
 *   get:
 *     summary: Récupérer le taux de conversion des points
 *     tags: [Points]
 *     responses:
 *       200:
 *         description: Taux de conversion récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 rate:
 *                   type: number
 *                   description: Taux de conversion (1 point = X unités monétaires)
 *                   example: 10
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/rate', getPointsRate);

/**
 * @swagger
 * /points/convert:
 *   post:
 *     summary: Convertir des points en solde
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: Nombre de points à convertir
 *                 example: 100
 *     responses:
 *       200:
 *         description: Conversion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Résultat de la conversion (montant converti, nouveau solde)
 *       400:
 *         description: Montant invalide ou solde insuffisant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
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
router.post('/convert', authMiddleware, convertPoints);

export default router;
