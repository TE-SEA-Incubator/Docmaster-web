import { Router } from 'express';
import {
  registerMyDocument,
  getMyDocuments,
  deleteDocument,
  reportDocumentLost,
  archiveDocument,
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
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [type_doc, numero_doc, nom_complet]
 *             properties:
 *               type_doc: { type: string, example: "CNI", description: "Code du type de document (CNI, PASSEPORT, etc.)" }
 *               numero_doc: { type: string, example: "123456789", description: "Numéro du document" }
 *               nom_complet: { type: string, example: "Jean Dupont", description: "Nom complet tel qu'inscrit sur le document" }
 *               nom_autorite: { type: string, example: "Ministère de l'Intérieur", description: "Autorité ayant délivré le document" }
 *               date_delivrance: { type: string, format: date, example: "2020-01-15", description: "Date de délivrance du document" }
 *               date_expiration: { type: string, format: date, example: "2030-01-15", description: "Date d'expiration du document" }
 *               notes: { type: string, example: "Document en bon état", description: "Notes personnelles sur le document" }
 *               photo_recto: { type: string, format: binary, description: "Photo du recto du document" }
 *               photo_verso: { type: string, format: binary, description: "Photo du verso du document" }
 *     responses:
 *       201:
 *         description: Document enregistré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDocument'
 *             example:
 *               success: true
 *               message: "Document personnel enregistré avec succès"
 *               data: { id: "uuid", type_doc: "CNI", numero_doc: "123456789", identifiant_doc_dm: "DM-12345", status: "SAFE" }
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Limite d'abonnement atteinte
 *         content:
 *           application/json:
 *             example: { success: false, message: "Limite atteinte", limit: 5, current: 5 }
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 *   get:
 *     summary: Lister mes documents personnels
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des documents récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 2 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserDocument'
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
router.post('/', authMiddleware, upload.fields([
  { name: 'photo_recto', maxCount: 1 },
  { name: 'photo_verso', maxCount: 1 }
]), registerMyDocument);

router.get('/', authMiddleware, getMyDocuments);

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Supprimer un document personnel
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID du document
 *     responses:
 *       200:
 *         description: Document supprimé avec succès
 *         content:
 *           application/json:
 *             example: { success: true, message: "Document supprimé avec succès" }
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Document non trouvé ou non autorisé
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
 *         description: Identifiant UUID du document
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, example: "monmotdepasse123", description: "Mot de passe de confirmation" }
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
 */
router.patch('/:id/lost', authMiddleware, reportDocumentLost);

/**
 * @swagger
 * /documents/{id}/archive:
 *   patch:
 *     summary: Archiver immédiatement un document expiré
 *     description: |
 *       Marque un document comme archivé (is_archived=true) si sa date_expiration
 *       est dépassée et que validity_option='EXPIRING'. Utilisé par l'app mobile
 *       pour éviter d'attendre le cron quotidien de 2h du matin.
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document archivé (ou déjà archivé)
 *       401: { description: Non authentifié }
 *       404: { description: Document introuvable }
 */
router.patch('/:id/archive', authMiddleware, archiveDocument);

export default router;
