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

/**
 * @swagger
 * /withdrawals/admin/pending:
 *   get:
 *     summary: Lister les demandes de retrait en attente (Admin)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des demandes en attente
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   user_id: "uuid"
 *                   amount: 5000
 *                   currency: "FCFA"
 *                   payment_method: "MTN_MOMO"
 *                   payment_details: "677000000"
 *                   status: "PENDING"
 *                   created_at: "2024-06-15T10:00:00Z"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/admin/pending', authMiddleware, controller.getAllPendingWithdrawals);

/**
 * @swagger
 * /withdrawals/admin/approve/{id}:
 *   post:
 *     summary: Approuver une demande de retrait (Admin)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de la demande de retrait
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_comment: { type: string, example: "Retrait approuvé" }
 *     responses:
 *       200:
 *         description: Demande approuvée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Demande de retrait approuvée"
 *               data: { id: "uuid", status: "APPROVED" }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Demande introuvable
 *       500:
 *         description: Erreur serveur
 */
router.post('/admin/approve/:id', authMiddleware, controller.approveWithdrawal);

/**
 * @swagger
 * /withdrawals/admin/reject/{id}:
 *   post:
 *     summary: Rejeter une demande de retrait (Admin)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de la demande de retrait
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_comment: { type: string, example: "Fonds insuffisants" }
 *     responses:
 *       200:
 *         description: Demande rejetée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Demande de retrait rejetée"
 *               data: { id: "uuid", status: "REJECTED" }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Demande introuvable
 *       500:
 *         description: Erreur serveur
 */
router.post('/admin/reject/:id', authMiddleware, controller.rejectWithdrawal);

export default router;
