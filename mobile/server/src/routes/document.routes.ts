import { Router } from 'express';
import { 
  registerMyDocument, 
  getMyDocuments,
  deleteDocument,
  reportDocumentLost
} from '../controllers/document.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { upload } from '../utils/upload.utils.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Gestion des documents personnels (CNI, Passeport, etc.)
 */

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Enregistrer un nouveau document personnel
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [type_doc, numero_doc, nom_complet]
 *             properties:
 *               type_doc: { type: string, example: "CNI" }
 *               numero_doc: { type: string, example: "123456789" }
 *               nom_complet: { type: string, example: "Jean Dupont" }
 *               date_expiration: { type: string, format: date }
 *               photo_recto: { type: string, format: binary }
 *               photo_verso: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Document enregistré avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Document personnel enregistré avec succès"
 *               data: { id: "uuid", type_doc: "CNI", identifiant_doc_dm: "DM-12345" }
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             example: { success: false, message: "Utilisateur non authentifié" }
 *       403:
 *         description: Limite d'abonnement atteinte
 *         content:
 *           application/json:
 *             example: { success: false, message: "Limite atteinte", limit: 5, current: 5 }
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             example: { success: false, message: "Erreur lors de l'enregistrement" }
 *   get:
 *     summary: Lister mes documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               count: 2
 *               data: [{ id: "uuid", type_doc: "CNI", status: "SAFE", identifiant_doc_dm: "DM-123" }]
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/', authMiddleware, upload.fields([
  { name: 'photo_recto', maxCount: 1 },
  { name: 'photo_verso', maxCount: 1 }
]), registerMyDocument);

router.get('/', authMiddleware, getMyDocuments);

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Supprimer un document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document supprimé avec succès
 *         content:
 *           application/json:
 *             example: { success: true, message: "Document supprimé avec succès" }
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Document non trouvé ou non autorisé
 *         content:
 *           application/json:
 *             example: { success: false, message: "Document non trouvé ou accès non autorisé" }
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authMiddleware, deleteDocument);

/**
 * @swagger
 * /documents/{id}/lost:
 *   patch:
 *     summary: Déclarer un document comme perdu
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, example: "monmotdepasse123" }
 *     responses:
 *       200:
 *         description: Déclaration de perte enregistrée
 *         content:
 *           application/json:
 *             example: { success: true, message: "Document déclaré comme perdu avec succès", data: { id: "uuid", status: "LOST" } }
 *       400:
 *         description: Erreur de mot de passe ou requête invalide
 *         content:
 *           application/json:
 *             example: { success: false, message: "Mot de passe incorrect" }
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/lost', authMiddleware, reportDocumentLost);

export default router;
