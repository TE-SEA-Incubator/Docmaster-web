import { Router } from 'express';
import { PaymentMethodController } from '../controllers/payment-method.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();
const controller = new PaymentMethodController();

/**
 * @swagger
 * tags:
 *   name: PaymentMethods
 *   description: Gestion des méthodes de paiement enregistrées
 */

/**
 * @swagger
 * /payment-methods:
 *   get:
 *     summary: Lister les méthodes de paiement de l'utilisateur
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des méthodes de paiement récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentMethod'
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
router.get('/', authMiddleware, controller.list);

/**
 * @swagger
 * /payment-methods:
 *   post:
 *     summary: Ajouter une nouvelle méthode de paiement
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method_type, account_number]
 *             properties:
 *               method_type:
 *                 type: string
 *                 enum: [MTN, ORANGE, BANK]
 *                 description: Type de méthode de paiement
 *                 example: "MTN"
 *               account_name:
 *                 type: string
 *                 description: Nom du titulaire du compte
 *                 example: "Jean Dupont"
 *               account_number:
 *                 type: string
 *                 description: Numéro de compte / téléphone
 *                 example: "+237677000000"
 *               bank_name:
 *                 type: string
 *                 description: Nom de la banque (si type = BANK)
 *                 example: "BGFI Bank"
 *               is_default:
 *                 type: boolean
 *                 description: Définir comme méthode par défaut
 *                 default: false
 *     responses:
 *       201:
 *         description: Méthode de paiement créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
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
router.post('/', authMiddleware, controller.create);

/**
 * @swagger
 * /payment-methods/{id}:
 *   put:
 *     summary: Modifier une méthode de paiement
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la méthode de paiement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method_type:
 *                 type: string
 *                 enum: [MTN, ORANGE, BANK]
 *               account_name:
 *                 type: string
 *               account_number:
 *                 type: string
 *               bank_name:
 *                 type: string
 *               is_default:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Méthode de paiement mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Méthode de paiement introuvable
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
router.put('/:id', authMiddleware, controller.update);

/**
 * @swagger
 * /payment-methods/{id}:
 *   delete:
 *     summary: Supprimer une méthode de paiement
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la méthode de paiement
 *     responses:
 *       200:
 *         description: Méthode de paiement supprimée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Méthode de paiement supprimée"
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Méthode de paiement introuvable
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
router.delete('/:id', authMiddleware, controller.remove);

/**
 * @swagger
 * /payment-methods/{id}/default:
 *   put:
 *     summary: Définir une méthode de paiement comme par défaut
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la méthode de paiement
 *     responses:
 *       200:
 *         description: Méthode définie par défaut
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       404:
 *         description: Méthode de paiement introuvable
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
router.put('/:id/default', authMiddleware, controller.setDefault);

export default router;
