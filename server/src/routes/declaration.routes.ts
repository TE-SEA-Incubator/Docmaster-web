import { Router } from 'express';
import { 
  createLostDeclaration,
  createFoundDeclaration,
  getMyDeclarations, 
  searchDeclarations,
  getGlobalStats,
  getPerformanceStats,
  searchPublicFound,
  getDeclarationById,
  getRenderContext,
  validateRecovery,
  initiateRecovery,
  generatePdf,
  deleteDeclaration
} from '../controllers/declaration.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { upload } from '../utils/upload.utils.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Declarations
 *   description: Gestion des déclarations de perte et de trouvaille
 */

/**
 * @swagger
 * /declarations/stats:
 *   get:
 *     summary: Récupérer les statistiques globales
 *     tags: [Declarations]
 *     responses:
 *       200:
 *         description: Statistiques récupérées
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { lost: 150, found: 45, returned: 12 }
 *       500:
 *         description: Erreur serveur
 */
router.get('/stats', getGlobalStats);

/**
 * @swagger
 * /declarations/performance:
 *   get:
 *     summary: Récupérer les statistiques de performance
 *     tags: [Declarations]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         description: Période d'analyse
 *     responses:
 *       200:
 *         description: Statistiques de performance récupérées
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { declarations: [], returns: [] }
 *       500:
 *         description: Erreur serveur
 */
router.get('/performance', getPerformanceStats);

/**
 * @swagger
 * /declarations/search-public:
 *   get:
 *     summary: Recherche publique de documents trouvés
 *     tags: [Declarations]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Nom ou numéro partiel du document
 *     responses:
 *       200:
 *         description: Résultats de la recherche
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               count: 1
 *               data: [{ id: "uuid", doc_type: "CNI", nom_complet: "J*** D***" }]
 *       500:
 *         description: Erreur serveur
 */
router.get('/search-public', searchPublicFound);

/**
 * @swagger
 * /declarations/lost:
 *   post:
 *     summary: Créer une déclaration de perte
 *     tags: [Declarations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [doc_type, nom_complet, document_number, ville]
 *             properties:
 *               doc_type: { type: string, example: "CNI" }
 *               nom_complet: { type: string, example: "Jean Dupont" }
 *               document_number: { type: string, example: "123456789" }
 *               ville: { type: string, example: "Douala" }
 *               quartier: { type: string, example: "Akwa" }
 *               date_perte: { type: string, format: date }
 *               telephone_contact: { type: string }
 *               recompense: { type: number, example: 5000 }
 *               photo_recto: { type: string, format: binary }
 *               photo_verso: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Déclaration créée avec succès
 *         content:
 *           application/json:
 *             example: { success: true, message: "Déclaration de perte enregistrée", data: { id: "uuid" } }
 *       400:
 *         description: Validation échouée
 *         content:
 *           application/json:
 *             example: { success: false, message: "Validation échouée", errors: ["Le champ doc_type est requis"] }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Limite d'abonnement atteinte
 *       500:
 *         description: Erreur serveur
 */
router.post('/lost', authMiddleware, upload.fields([
  { name: 'photo_recto', maxCount: 1 },
  { name: 'photo_verso', maxCount: 1 }
]), createLostDeclaration);

/**
 * @swagger
 * /declarations/found:
 *   post:
 *     summary: Créer une déclaration de trouvaille
 *     tags: [Declarations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [doc_type, nom_complet, document_number, ville]
 *             properties:
 *               doc_type: { type: string, example: "CNI" }
 *               nom_complet: { type: string, example: "Jean Dupont" }
 *               document_number: { type: string, example: "123456789" }
 *               ville: { type: string, example: "Douala" }
 *               quartier: { type: string, example: "Akwa" }
 *               date_trouvaille: { type: string, format: date }
 *               telephone_contact: { type: string }
 *               photo_recto: { type: string, format: binary }
 *               photo_verso: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Déclaration créée avec succès
 *         content:
 *           application/json:
 *             example: { success: true, message: "Déclaration de document trouvé enregistrée", data: { id: "uuid" } }
 *       400:
 *         description: Validation échouée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Limite d'abonnement atteinte
 *       500:
 *         description: Erreur serveur
 */
router.post('/found', authMiddleware, upload.fields([
  { name: 'photo_recto', maxCount: 1 },
  { name: 'photo_verso', maxCount: 1 }
]), createFoundDeclaration);

/**
 * @swagger
 * /declarations/me:
 *   get:
 *     summary: Lister mes déclarations
 *     tags: [Declarations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             example: 
 *               success: true
 *               count: 2
 *               data: 
 *                 - id: "uuid"
 *                   declaration_type: "LOST"
 *                   status: "MATCHED"
 *                   matches: [{ id: "uuid", status: "PENDING" }]
 *                   docTypeInfo: { id: "uuid", nom: "CNI" }
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/me', authMiddleware, getMyDeclarations);

/**
 * @swagger
 * /declarations:
 *   get:
 *     summary: Rechercher des déclarations (Filtres)
 *     tags: [Declarations]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [LOST, FOUND] }
 *       - in: query
 *         name: doc_type
 *         schema: { type: string }
 *       - in: query
 *         name: ville
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             example: { success: true, count: 5, data: [] }
 *       500:
 *         description: Erreur serveur
 */
router.get('/', authMiddleware, searchDeclarations);

/**
 * @swagger
 * /declarations/{id}:
 *   get:
 *     summary: Détails d'une déclaration et de ses correspondances (Matching)
 *     tags: [Declarations]
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
 *         description: Détails récupérés avec informations de matching
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: 
 *                 id: "uuid"
 *                 declaration_type: "LOST"
 *                 status: "MATCHED"
 *                 matches: [{ id: "uuid", status: "PENDING", match_score: 95 }]
 *                 docTypeInfo: { id: "uuid", nom: "CNI" }
 *                 reward_amount: 2500
 *                 reward_points: 50
 *                 counterPart: { id: "uuid", nom: "Dupont", prenom: "Jean", telephone: "677..." }
 *                 counterPartPhotoRecto: "uploads/..."
 *                 counterPartPhotoVerso: "uploads/..."
 *                 claim: { id: "uuid", validation_code: "123456", is_validated: false }
 *       404:
 *         description: Déclaration introuvable
 *         content:
 *           application/json:
 *             example: { success: false, message: "Déclaration introuvable" }
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', authMiddleware, getDeclarationById);

/**
 * @swagger
 * /declarations/{id}/render-context:
 *   get:
 *     summary: Obtenir tout le contexte pour la page de remise/récupération
 *     tags: [Declarations]
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
 *         description: Contexte récupéré avec succès
 *       403:
 *         description: Action non autorisée
 *       404:
 *         description: Déclaration introuvable
 */
router.get('/:id/render-context', authMiddleware, getRenderContext);

/**
 * @swagger
 * /declarations/{id}/validate-recovery:
 *   post:
 *     summary: Valider le code de remise et traiter les récompenses
 *     tags: [Declarations]
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
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 */
router.post('/:id/validate-recovery', authMiddleware, validateRecovery);

/**
 * @swagger
 * /declarations/{id}/initiate-recovery:
 *   post:
 *     summary: Initier la récupération d'un document
 *     tags: [Declarations]
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
 *             required: [amount, method, phone]
 *             properties:
 *               amount: { type: number, example: 5000 }
 *               method: { type: string, example: "MTN_MOMO" }
 *               phone: { type: string, example: "677000000" }
 *     responses:
 *       200:
 *         description: Récupération initiée
 *         content:
 *           application/json:
 *             example: { success: true, message: "Paiement initié", data: { paymentId: "uuid" } }
 *       400:
 *         description: Erreur (ex. Montant insuffisant, Déjà en cours)
 *         content:
 *           application/json:
 *             example: { success: false, message: "Le document est déjà en cours de récupération" }
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
/**
 * @swagger
 * /declarations/recover:
 *   post:
 *     summary: Initier la récupération d'un document (par body)
 *     tags: [Declarations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, method, phone]
 *             properties:
 *               amount: { type: number, example: 5000, description: "Montant de la récompense en FCFA" }
 *               method: { type: string, example: "MTN_MOMO", enum: [MTN_MOMO, ORANGE_MONEY, CARD] }
 *               phone: { type: string, example: "677000000", description: "Numéro de téléphone pour le paiement" }
 *     responses:
 *       200:
 *         description: Récupération initiée avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Paiement initié. Veuillez valider sur votre téléphone."
 *               data: { paymentId: "uuid", status: "PENDING" }
 *       400:
 *         description: Erreur de validation (montant insuffisant, déjà en cours)
 *         content:
 *           application/json:
 *             example: { success: false, message: "Le document est déjà en cours de récupération" }
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/recover', authMiddleware, initiateRecovery);

/**
 * @swagger
 * /declarations/{id}/pdf:
 *   get:
 *     summary: Générer un PDF de la déclaration
 *     tags: [Declarations]
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
 *         description: Fichier PDF généré
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Déclaration introuvable
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id/pdf', authMiddleware, generatePdf);

/**
 * @swagger
 * /declarations/{id}:
 *   delete:
 *     summary: Supprimer (soft delete) une déclaration
 *     tags: [Declarations]
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
 *         description: Déclaration supprimée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Action non autorisée
 *       404:
 *         description: Déclaration introuvable
 */
router.delete('/:id', authMiddleware, deleteDeclaration);

export default router;
