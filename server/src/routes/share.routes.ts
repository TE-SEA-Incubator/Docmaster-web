import { Router } from 'express';
import { 
  createShare, 
  getSharedDocument, 
  getDocumentShares, 
  revokeShare 
} from '../controllers/share.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Shares
 *   description: Partage sécurisé de documents via liens temporaires
 */

/**
 * @swagger
 * /shares/public/{token}:
 *   get:
 *     summary: Accéder à un document partagé via son token
 *     tags: [Shares]
 *     description: Endpoint public - aucune authentification requise. Le token doit être valide et non expiré.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de partage unique
 *     responses:
 *       200:
 *         description: Document partagé récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     document:
 *                       $ref: '#/components/schemas/UserDocument'
 *                     owner:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: Token invalide ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/public/:token', getSharedDocument);

/**
 * @swagger
 * /shares/{documentId}:
 *   post:
 *     summary: Créer un lien de partage pour un document
 *     tags: [Shares]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID du document à partager
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresInHours: { type: number, example: 24, description: "Durée de validité en heures (défaut: 24h)" }
 *     responses:
 *       201:
 *         description: Lien de partage créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 token: { type: string, example: "abc123def456" }
 *                 shareUrl: { type: string, example: "http://localhost:5173/share?token=abc123def456" }
 *                 expires_at: { type: string, format: date-time, example: "2024-06-16T10:00:00Z" }
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Document introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 *   get:
 *     summary: Lister les partages actifs d'un document
 *     tags: [Shares]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID du document
 *     responses:
 *       200:
 *         description: Liste des partages récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Share'
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
router.post('/:documentId', authMiddleware, createShare);
router.get('/:documentId', authMiddleware, getDocumentShares);

/**
 * @swagger
 * /shares/{shareId}:
 *   delete:
 *     summary: Révoquer un lien de partage
 *     tags: [Shares]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID du partage à révoquer
 *     responses:
 *       200:
 *         description: Partage révoqué avec succès
 *         content:
 *           application/json:
 *             example: { success: true, message: "Partage révoqué avec succès" }
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Partage introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.delete('/:shareId', authMiddleware, revokeShare);

export default router;
