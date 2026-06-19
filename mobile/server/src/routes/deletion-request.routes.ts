import { Router } from 'express';
import {
  requestDeletionDeclaration,
  getMyDeletionRequests,
  getDeletionRequestById,
  getPendingDeletionRequests,
  approveDeletionRequest,
  rejectDeletionRequest
} from '../controllers/deletion-request.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: DeletionRequests
 *   description: Gestion des demandes de suppression de déclarations
 */

/**
 * @swagger
 * /deletion-requests/me:
 *   get:
 *     summary: Lister mes demandes de suppression
 *     tags: [DeletionRequests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 */
router.get('/me', authMiddleware, getMyDeletionRequests);

/**
 * @swagger
 * /deletion-requests/{id}:
 *   get:
 *     summary: Détails d'une demande de suppression
 *     tags: [DeletionRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Détails récupérés
 */
router.get('/:id', authMiddleware, getDeletionRequestById);

/**
 * @swagger
 * /deletion-requests/declarations/{id}/request-deletion:
 *   post:
 *     summary: Demander la suppression d'une déclaration
 *     tags: [DeletionRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: "Document retrouvé ailleurs" }
 *     responses:
 *       201:
 *         description: Demande envoyée
 */
router.post('/declarations/:id/request-deletion', authMiddleware, requestDeletionDeclaration);

// Admin routes
router.get('/admin/pending', authMiddleware, getPendingDeletionRequests);
router.post('/admin/:id/approve', authMiddleware, approveDeletionRequest);
router.post('/admin/:id/reject', authMiddleware, rejectDeletionRequest);

export default router;
