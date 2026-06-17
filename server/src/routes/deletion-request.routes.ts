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

/**
 * @swagger
 * /deletion-requests/admin/pending:
 *   get:
 *     summary: Lister les demandes de suppression en attente (Admin)
 *     tags: [DeletionRequests]
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
 *                   declaration_id: "uuid"
 *                   user_id: "uuid"
 *                   reason: "Document retrouvé ailleurs"
 *                   reason_type: "OTHER"
 *                   status: "PENDING"
 *                   created_at: "2024-06-15T10:00:00Z"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/admin/pending', authMiddleware, getPendingDeletionRequests);

/**
 * @swagger
 * /deletion-requests/admin/{id}/approve:
 *   post:
 *     summary: Approuver une demande de suppression (Admin)
 *     tags: [DeletionRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de la demande de suppression
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_comment: { type: string, example: "Suppression approuvée après vérification" }
 *     responses:
 *       200:
 *         description: Demande approuvée et exécutée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Demande de suppression approuvée et exécutée"
 *               data: { id: "uuid", status: "EXECUTED" }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Demande introuvable
 *       500:
 *         description: Erreur serveur
 */
router.post('/admin/:id/approve', authMiddleware, approveDeletionRequest);

/**
 * @swagger
 * /deletion-requests/admin/{id}/reject:
 *   post:
 *     summary: Rejeter une demande de suppression (Admin)
 *     tags: [DeletionRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de la demande de suppression
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_comment: { type: string, example: "Raison non justifiée" }
 *     responses:
 *       200:
 *         description: Demande rejetée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Demande de suppression rejetée"
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
router.post('/admin/:id/reject', authMiddleware, rejectDeletionRequest);

export default router;
