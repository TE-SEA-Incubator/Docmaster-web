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
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *     responses:
 *       200:
 *         description: Document récupéré
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresInHours: { type: number, example: 24 }
 *     responses:
 *       201:
 *         description: Lien créé
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               token: "..."
 *               shareUrl: "http://localhost:5173/share?token=..."
 *   get:
 *     summary: Lister les partages actifs d'un document
 *     tags: [Shares]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *     responses:
 *       200:
 *         description: Liste récupérée
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
 *     responses:
 *       200:
 *         description: Partage révoqué
 */
router.delete('/:shareId', authMiddleware, revokeShare);

export default router;
