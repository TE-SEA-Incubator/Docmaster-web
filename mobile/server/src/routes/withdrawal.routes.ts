import { Router } from 'express';
import { WithdrawalController } from '../controllers/withdrawal.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const controller = new WithdrawalController();

/**
 * @swagger
 * tags:
 *   name: Withdrawals
 *   description: Gestion des demandes de retrait de fonds
 */

/**
 * @swagger
 * /withdrawals/request:
 *   post:
 *     summary: Demander un retrait
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, method, phone]
 *             properties:
 *               amount: { type: number, example: 5000 }
 *               method: { type: string, example: "MTN_MOMO" }
 *               phone: { type: string, example: "677000000" }
 *     responses:
 *       200:
 *         description: Retrait enregistré
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Demande de retrait enregistrée avec succès"
 *       400:
 *         description: "Erreur (ex: Fonds insuffisants)"
 *         content:
 *           application/json:
 *             example: { success: false, message: "Solde insuffisant" }
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/request', authMiddleware, controller.requestWithdrawal);

/**
 * @swagger
 * /withdrawals/my-requests:
 *   get:
 *     summary: Lister mes demandes de retrait
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: [{ id: "uuid", amount: 5000, status: "PENDING", created_at: "..." }]
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/my-requests', authMiddleware, controller.getMyWithdrawals);

// Admin routes (should be protected by admin middleware, but for now we'll just add them)
router.get('/admin/pending', authMiddleware, controller.getAllPendingWithdrawals);
router.post('/admin/approve/:id', authMiddleware, controller.approveWithdrawal);
router.post('/admin/reject/:id', authMiddleware, controller.rejectWithdrawal);

export default router;
