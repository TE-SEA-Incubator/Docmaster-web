import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.ts';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const notificationController = new NotificationController();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Gestion des notifications utilisateur
 */

router.use(authMiddleware);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Lister mes notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des notifications récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
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
router.get('/', notificationController.getMyNotifications);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Marquer une notification comme lue
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de la notification
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessTrue'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Notification introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Marquer toutes les notifications comme lues
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Toutes les notifications marquées comme lues
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessTrue'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       500:
 *         description: Erreur serveur
 */
router.patch('/read-all', notificationController.markAllRead);

/**
 * @swagger
 * /notifications/register-push-token:
 *   post:
 *     summary: Enregistrer un token push FCM
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM push token
 *               platform:
 *                 type: string
 *                 enum: [android, ios, web]
 *                 default: android
 *     responses:
 *       200:
 *         description: Token enregistré
 *       401:
 *         description: Non authentifié
 */
router.post('/register-push-token', notificationController.registerPushToken);
router.delete('/unregister-push-token', notificationController.registerPushToken); // reuses same handler with unregister=true

/**
 * @swagger
 * /notifications/broadcast:
 *   post:
 *     summary: Envoyer une notification push à tous les utilisateurs (Admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Nouveauté DocMaster !"
 *               message:
 *                 type: string
 *                 example: "Découvrez notre nouvelle fonctionnalité de scan..."
 *     responses:
 *       200:
 *         description: Broadcast envoyé
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès interdit (admin requis)
 */
router.post('/broadcast', adminMiddleware, notificationController.sendBroadcast);

export default router;
