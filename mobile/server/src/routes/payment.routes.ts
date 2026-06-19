import { Router } from 'express';
import { nokashCallback, getMyTransactions, getAllTransactions, payRecovery } from '../controllers/payment.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Gestion des paiements et transactions
 */

/**
 * @swagger
 * /payments/pay-recovery:
 *   post:
 *     summary: Payer les frais de récupération
 *     tags: [Payments]
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
 *               docId: { type: string, example: "uuid" }
 *               amount: { type: number, example: 5000 }
 *               paymentMethod: { type: string, example: "ORANGE_MONEY" }
 *     responses:
 *       200:
 *         description: Paiement initié
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Paiement initié. Veuillez valider sur votre téléphone."
 *               data: { nokashId: "...", orderId: "..." }
 *       400:
 *         description: "Erreur de validation (ex: docId manquant)"
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/pay-recovery', authMiddleware, payRecovery);

router.post('/nokash/callback', nokashCallback);

/**
 * @swagger
 * /payments/my-history:
 *   get:
 *     summary: Historique des transactions
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               transactions: [{ id: "uuid", amount: 5000, type: "recovery_fee", status: "SUCCESS", created_at: "..." }]
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/my-history', authMiddleware, getMyTransactions);
router.get('/transactions', authMiddleware, getMyTransactions);

router.get('/admin/all', authMiddleware, getAllTransactions);

export default router;
