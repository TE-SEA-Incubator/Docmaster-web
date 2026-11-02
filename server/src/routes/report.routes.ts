import { Router } from 'express';
import {
  applyReportAction,
  createReport,
  getMyReports,
  listReports,
  reviewReport,
} from '../controllers/report.controller.ts';
import { adminMiddleware, authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Signalements et support
 */

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Signaler une déclaration, un match, un message ou envoyer une demande de support
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Signalement enregistré
 */
router.post('/', authMiddleware, createReport);

/**
 * @swagger
 * /reports/me:
 *   get:
 *     summary: Lister mes signalements
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authMiddleware, getMyReports);

/**
 * @swagger
 * /reports/admin:
 *   get:
 *     summary: Lister les signalements (Admin)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin', authMiddleware, adminMiddleware, listReports);

/**
 * @swagger
 * /reports/admin/{id}:
 *   patch:
 *     summary: Traiter un signalement (Admin)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/:id', authMiddleware, adminMiddleware, reviewReport);

/**
 * @swagger
 * /reports/admin/{id}/actions:
 *   post:
 *     summary: Exécuter une action de dossier depuis un signalement (Admin)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.post('/admin/:id/actions', authMiddleware, adminMiddleware, applyReportAction);

export default router;
