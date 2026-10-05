import { Router } from 'express';
import { recoveryController } from '../controllers/recovery.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Recovery
 *   description: API Unifiée de Récupération de Documents DocMaster
 */

/**
 * @swagger
 * /recovery/pay:
 *   post:
 *     summary: Propriétaire - Initié & payer les frais de récupération (MoMo ou Points)
 *     tags: [Recovery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docId, paymentMethod]
 *             properties:
 *               docId: { type: string, description: "ID du document perdu" }
 *               paymentMethod: { type: string, example: "MTN_MOMO", enum: [MTN_MOMO, ORANGE_MONEY, POINTS] }
 *               phone: { type: string, example: "677000000" }
 *               amount: { type: number, example: 5000 }
 *     responses:
 *       200:
 *         description: Paiement initié ou validé (points)
 */
router.post('/pay', authMiddleware, (req, res) => recoveryController.payRecovery(req, res));

/**
 * @swagger
 * /recovery/status/{docId}:
 *   get:
 *     summary: Obtenir le statut de récupération et le code secret (si propriétaire payé)
 *     tags: [Recovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Informations sur la récupération
 */
router.get('/status/:docId', authMiddleware, (req, res) => recoveryController.getRecoveryStatus(req, res));

/**
 * @swagger
 * /recovery/validate:
 *   post:
 *     summary: Trouveur - Valider le code à 6 chiffres lors de la remise physique
 *     tags: [Recovery]
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
 *               docId: { type: string, description: "ID du document" }
 *               code: { type: string, example: "123456", description: "Code secret à 6 chiffres" }
 *     responses:
 *       200:
 *         description: Code validé, remise confirmée, récompense versée au trouveur
 */
router.post('/validate', authMiddleware, (req, res) => recoveryController.validateCode(req, res));

export default router;
