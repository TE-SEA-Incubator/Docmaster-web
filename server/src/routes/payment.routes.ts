import { Router } from 'express';
import { nokashCallback, getMyTransactions, getAllTransactions, payRecovery, forceCheckTransaction } from '../controllers/payment.controller.ts';
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

/**
 * @swagger
 * /payments/nokash/callback:
 *   post:
 *     summary: Callback webhook de Nokash après traitement du paiement
 *     tags: [Payments]
 *     description: Endpoint appelé par Nokash pour confirmer ou rejeter un paiement. Ne nécessite pas d'authentification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, status]
 *             properties:
 *               orderId: { type: string, example: "uuid", description: "Identifiant de la commande" }
 *               status: { type: string, enum: [SUCCESS, FAILED], example: "SUCCESS" }
 *               nokashId: { type: string, example: "nokash_ref_123", description: "Référence Nokash" }
 *               amount: { type: number, example: 5000 }
 *               metadata: { type: object, example: { docId: "uuid" } }
 *     responses:
 *       200:
 *         description: Callback traité avec succès
 *         content:
 *           application/json:
 *             example: { received: true }
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
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
/**
 * @swagger
 * /payments/transactions:
 *   get:
 *     summary: Historique des transactions (alias de /my-history)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des transactions récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               transactions:
 *                 - id: "uuid"
 *                   amount: 5000
 *                   currency: "FCFA"
 *                   type: "recovery_fee"
 *                   status: "SUCCESS"
 *                   payment_method: "MTN_MOMO"
 *                   created_at: "2024-06-15T10:00:00Z"
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/transactions', authMiddleware, getMyTransactions);

/**
 * @swagger
 * /payments/admin/all:
 *   get:
 *     summary: Lister toutes les transactions (Admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, SUCCESS, FAILED] }
 *         description: Filtrer par statut
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [subscription, declatat_fee, finder_payout, recovery_fee] }
 *         description: Filtrer par type de transaction
 *     responses:
 *       200:
 *         description: Liste des transactions
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   user_id: "uuid"
 *                   amount: 5000
 *                   currency: "FCFA"
 *                   type: "recovery_fee"
 *                   status: "SUCCESS"
 *                   created_at: "2024-06-15T10:00:00Z"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/admin/all', authMiddleware, getAllTransactions);

/**
 * @swagger
 * /payments/check/{externalRef}:
 *   get:
 *     summary: Vérifier manuellement le statut d'une transaction auprès de Nokash
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: externalRef
 *         required: true
 *         schema:
 *           type: string
 *         description: Référence externe Nokash de la transaction
 *     responses:
 *       200:
 *         description: Statut vérifié
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Transaction non trouvée
 */
router.get('/check/:externalRef', authMiddleware, forceCheckTransaction);

export default router;
