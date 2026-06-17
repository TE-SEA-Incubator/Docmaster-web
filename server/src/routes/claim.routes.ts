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
/**
 * @swagger
 * /claims/create:
 *   post:
 *     summary: Créer une demande de remise manuellement (alias)
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
 *               docId: { type: string, format: uuid, example: "uuid" }
 *               ownerId: { type: string, format: uuid, example: "uuid" }
 *               finderId: { type: string, format: uuid, example: "uuid" }
 *     responses:
 *       200:
 *         description: Claim créé avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", verification_code: "123456", status: "PENDING" }
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/create', authMiddleware, (req, res) => claimController.createClaim(req, res));

/**
 * @swagger
 * /claims:
 *   post:
 *     summary: Créer une demande de remise
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
 *               docId: { type: string, format: uuid, example: "uuid", description: "ID de la déclaration" }
 *               ownerId: { type: string, format: uuid, example: "uuid", description: "ID du propriétaire du document" }
 *               finderId: { type: string, format: uuid, example: "uuid", description: "ID du trouvreur" }
 *     responses:
 *       201:
 *         description: Claim créé avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "uuid"
 *                 doc_id: "uuid"
 *                 owner_id: "uuid"
 *                 finder_id: "uuid"
 *                 verification_code: "123456"
 *                 status: "PENDING"
 *                 created_at: "2024-06-15T10:00:00Z"
 *       400:
 *         description: Paramètres invalides ou claim déjà existant
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
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
/**
 * @swagger
 * /claims/{id}:
 *   get:
 *     summary: Récupérer un claim actif par son ID ou par document
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du claim ou ID du document
 *     responses:
 *       200:
 *         description: Claim trouvé avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "uuid"
 *                 doc_id: "uuid"
 *                 owner_id: "uuid"
 *                 finder_id: "uuid"
 *                 verification_code: "123456"
 *                 is_validated: false
 *                 reward_amount: 2500
 *                 status: "PENDING"
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Aucun claim actif trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/active/:docId', authMiddleware, (req, res) => claimController.getActiveClaim(req, res));
router.get('/:id', authMiddleware, (req, res) => claimController.getActiveClaim(req, res));

/**
 * @swagger
 * /claims/pay:
 *   post:
 *     summary: Payer les frais de récupération d'un document (alias paiement)
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docId, amount, paymentMethod]
 *             properties:
 *               docId: { type: string, format: uuid, example: "uuid", description: "ID du document à récupérer" }
 *               amount: { type: number, example: 5000, description: "Montant des frais en FCFA" }
 *               paymentMethod: { type: string, example: "MTN_MOMO", enum: [MTN_MOMO, ORANGE_MONEY, CARD] }
 *               phone: { type: string, example: "677000000", description: "Numéro de téléphone pour le paiement mobile" }
 *     responses:
 *       200:
 *         description: Paiement initié avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Paiement initié. Veuillez valider sur votre téléphone."
 *               data: { nokashId: "...", orderId: "uuid", status: "PENDING" }
 *       400:
 *         description: Erreur de validation (montant insuffisant, document introuvable)
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/pay', authMiddleware, payRecovery);

export default router;
