import { Router } from 'express';
import { SmsController } from '../controllers/sms.controller.ts';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const smsController = new SmsController();

/**
 * @swagger
 * tags:
 *   name: SMS
 *   description: Gestion des SMS (Administration uniquement)
 */

// All routes here require admin authentication
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * @swagger
 * /sms/balance:
 *   get:
 *     summary: Récupérer le solde SMS
 *     tags: [SMS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Solde SMS récupéré
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
 *                   description: Solde et informations du compte SMS
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Accès interdit — Privilèges administrateur requis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/balance', (req, res) => smsController.getBalance(req, res));

/**
 * @swagger
 * /sms/usage:
 *   get:
 *     summary: Récupérer l'utilisation des SMS
 *     tags: [SMS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques d'utilisation SMS récupérées
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
 *                   description: Statistiques d'envoi de SMS
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Accès interdit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/usage', (req, res) => smsController.getUsage(req, res));

/**
 * @swagger
 * /sms/purchase-history:
 *   get:
 *     summary: Récupérer l'historique des achats SMS
 *     tags: [SMS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historique des achats SMS récupéré
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
 *                     type: object
 *                     description: Entrée d'historique d'achat SMS
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Accès interdit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/purchase-history', (req, res) => smsController.getPurchaseHistory(req, res));

/**
 * @swagger
 * /sms/send:
 *   post:
 *     summary: Envoyer un SMS
 *     tags: [SMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               recipients:
 *                 type: string
 *                 description: Numéros de destinataires séparés par des virgules
 *                 example: "+237677000000,+237678000000"
 *               message:
 *                 type: string
 *                 description: Contenu du message SMS
 *                 example: "Votre document a été trouvé."
 *               type:
 *                 type: string
 *                 description: Type de SMS (notification, marketing, etc.)
 *                 example: "notification"
 *     responses:
 *       200:
 *         description: SMS envoyé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "SMS envoyé avec succès"
 *       400:
 *         description: Données invalides
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
 *       403:
 *         description: Accès interdit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.post('/send', (req, res) => smsController.sendSms(req, res));

export default router;
