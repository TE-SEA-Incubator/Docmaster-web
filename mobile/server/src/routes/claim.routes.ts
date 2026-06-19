import { Router } from 'express';
import { ClaimController } from '../controllers/claim.controller.ts';
import { payRecovery } from '../controllers/payment.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const claimController = new ClaimController();

/**
 * @swagger
 * tags:
 *   name: Claims
 *   description: Gestion des remises de documents (Validation par code)
 */

/**
 * @swagger
 * /claims/create:
 *   post:
 *     summary: Créer une demande de remise manuellement
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docId, ownerId, finderId]
 *             properties:
 *               docId: { type: string, example: "uuid" }
 *               ownerId: { type: string, example: "uuid" }
 *               finderId: { type: string, example: "uuid" }
 *     responses:
 *       200:
 *         description: Claim créé
 */
router.post('/create', authMiddleware, (req, res) => claimController.createClaim(req, res));
router.post('/', authMiddleware, (req, res) => claimController.createClaim(req, res));

/**
 * @swagger
 * /claims/validate:
 *   post:
 *     summary: Valider le code de remise (Finder)
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docId, code]
 *             properties:
 *               docId: { type: string, example: "uuid" }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Code validé, document remis, récompenses attribuées
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Code validé avec succès ! Le document a été officiellement remis."
 *       400:
 *         description: Code invalide ou déjà validé
 *         content:
 *           application/json:
 *             example: { success: false, message: "Code invalide" }
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/validate', authMiddleware, (req, res) => claimController.validateCode(req, res));

/**
 * @swagger
 * /claims/active/{docId}:
 *   get:
 *     summary: Récupérer le claim actif pour un document (et statut du matching)
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docId
 *         required: true
 *     responses:
 *       200:
 *         description: Claim trouvé avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", doc_id: "uuid", owner_id: "uuid", finder_id: "uuid", validation_code: "123456", is_validated: false, reward_amount: 2500 }
 *       404:
 *         description: Aucun claim actif
 *       500:
 *         description: Erreur serveur
 */
router.get('/active/:docId', authMiddleware, (req, res) => claimController.getActiveClaim(req, res));
router.get('/:id', authMiddleware, (req, res) => claimController.getActiveClaim(req, res));

// Payment alias
router.post('/pay', authMiddleware, payRecovery);

export default router;
