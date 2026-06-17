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
/**
 * @swagger
 * /document-types/active:
 *   get:
 *     summary: Liste des types de documents actifs (public)
 *     tags: [DocumentTypes]
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   nom: "Carte Nationale d'Identité"
 *                   code: "CNI"
 *                   prix_retrouvaille: 2500
 *                   points_recompense: 50
 *                   is_active: true
 *       500:
 *         description: Erreur serveur
 */
router.get('/active', (req, res) => docTypeController.getActive(req, res));

/**
 * @swagger
 * /document-types:
 *   get:
 *     summary: Lister tous les types de documents (Admin)
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste complète des types de documents
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   nom: "Carte Nationale d'Identité"
 *                   code: "CNI"
 *                   description: "Carte d'identité nationale camerounaise"
 *                   prix_retrouvaille: 2500
 *                   finder_percent: 60
 *                   app_percent: 40
 *                   points_recompense: 50
 *                   delai_expiration_mois: 60
 *                   is_active: true
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/', authMiddleware, adminMiddleware, (req, res) => docTypeController.getAll(req, res));

/**
 * @swagger
 * /document-types:
 *   post:
 *     summary: Créer un nouveau type de document (Admin)
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, code, prix_retrouvaille]
 *             properties:
 *               nom: { type: string, example: "Permis de conduire" }
 *               code: { type: string, example: "PC" }
 *               description: { type: string, example: "Permis de conduire camerounais" }
 *               prix_retrouvaille: { type: number, example: 3000 }
 *               finder_percent: { type: number, example: 60 }
 *               app_percent: { type: number, example: 40 }
 *               points_recompense: { type: integer, example: 75 }
 *               delai_expiration_mois: { type: integer, example: 60 }
 *               icone: { type: string, example: "car" }
 *               categorie: { type: string, example: "transport" }
 *     responses:
 *       201:
 *         description: Type de document créé avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", nom: "Permis de conduire", code: "PC" }
 *       400:
 *         description: Champs requis manquants ou code déjà existant
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.post('/', authMiddleware, adminMiddleware, (req, res) => docTypeController.create(req, res));

/**
 * @swagger
 * /document-types/{id}:
 *   put:
 *     summary: Mettre à jour un type de document (Admin)
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID du type de document
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string, example: "Carte d'identité" }
 *               description: { type: string, example: "Nouvelle description" }
 *               prix_retrouvaille: { type: number, example: 3000 }
 *               finder_percent: { type: number, example: 60 }
 *               app_percent: { type: number, example: 40 }
 *               points_recompense: { type: integer, example: 75 }
 *               delai_expiration_mois: { type: integer, example: 60 }
 *               icone: { type: string, example: "id-card" }
 *               categorie: { type: string, example: "identity" }
 *               is_active: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Type de document mis à jour
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", nom: "Carte d'identité", prix_retrouvaille: 3000 }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Type de document introuvable
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => docTypeController.update(req, res));

/**
 * @swagger
 * /document-types/{id}:
 *   delete:
 *     summary: Supprimer un type de document (Admin)
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID du type de document
 *     responses:
 *       200:
 *         description: Type de document supprimé
 *         content:
 *           application/json:
 *             example: { success: true, message: "Type de document supprimé avec succès" }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Type de document introuvable
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => docTypeController.delete(req, res));

/**
 * @swagger
 * /document-types/{id}/toggle:
 *   patch:
 *     summary: Activer/Désactiver un type de document (Admin)
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID du type de document
 *     responses:
 *       200:
 *         description: Statut inversé avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", is_active: false }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Type de document introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/toggle', authMiddleware, adminMiddleware, (req, res) => docTypeController.toggleActive(req, res));

export default router;
