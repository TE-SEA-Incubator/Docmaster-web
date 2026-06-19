import { Router } from 'express';
import { DocumentTypeController } from '../controllers/document-type.controller.ts';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const docTypeController = new DocumentTypeController();

/**
 * @swagger
 * tags:
 *   name: DocumentTypes
 *   description: Référentiel des types de documents (CNI, Passeport, etc.)
 */

/**
 * @swagger
 * /document-types/active:
 *   get:
 *     summary: Liste des types de documents actifs
 *     tags: [DocumentTypes]
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: [{ id: "uuid", name: "CNI", code: "cni", recovery_fee: 2500 }]
 */
router.get('/active', (req, res) => docTypeController.getActive(req, res));

// Admin routes
router.get('/', authMiddleware, adminMiddleware, (req, res) => docTypeController.getAll(req, res));
router.post('/', authMiddleware, adminMiddleware, (req, res) => docTypeController.create(req, res));
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => docTypeController.update(req, res));
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => docTypeController.delete(req, res));
router.patch('/:id/toggle', authMiddleware, adminMiddleware, (req, res) => docTypeController.toggleActive(req, res));

export default router;
