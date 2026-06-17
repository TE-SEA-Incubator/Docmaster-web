import { Router } from 'express';
import { 
  getAllPlans,
  getPlanById, 
  updatePlan, 
  createPlan,
  getFeatureDefinitions
} from '../controllers/plan.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

const adminMiddleware = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: "Accès refusé. Droits administrateur requis." });
    }
};

/**
 * @swagger
 * tags:
 *   name: Plans
 *   description: Gestion des forfaits d'abonnement
 */

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Lister tous les forfaits disponibles (public)
 *     tags: [Plans]
 *     responses:
 *       200:
 *         description: Liste des forfaits récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "free"
 *                   name: "Gratuit"
 *                   price: 0
 *                   currency: "FCFA"
 *                   duration_months: 1
 *                   features: { max_declarations: 2, max_shares: 1 }
 *                 - id: "premium"
 *                   name: "Premium"
 *                   price: 5000
 *                   currency: "FCFA"
 *                   duration_months: 1
 *                   features: { max_declarations: 50, max_shares: 20 }
 *       500:
 *         description: Erreur serveur
 */
router.get('/', getAllPlans);

/**
 * @swagger
 * /plans/features/definitions:
 *   get:
 *     summary: Récupérer les définitions de toutes les features (Admin)
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Définitions des features récupérées
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - key: "max_declarations"
 *                   label: "Déclarations max"
 *                   type: "number"
 *                 - key: "max_shares"
 *                   label: "Partages max"
 *                   type: "number"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/features/definitions', authMiddleware, adminMiddleware, getFeatureDefinitions);

/**
 * @swagger
 * /plans/{id}:
 *   get:
 *     summary: Récupérer un forfait par son ID (Admin)
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant du forfait
 *     responses:
 *       200:
 *         description: Détails du forfait
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "premium"
 *                 name: "Premium"
 *                 price: 5000
 *                 currency: "FCFA"
 *                 features: { max_declarations: 50 }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Forfait introuvable
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', authMiddleware, adminMiddleware, getPlanById);

/**
 * @swagger
 * /plans/{id}:
 *   put:
 *     summary: Mettre à jour un forfait (Admin)
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant du forfait
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Premium+" }
 *               price: { type: number, example: 7500 }
 *               currency: { type: string, example: "FCFA" }
 *               duration_months: { type: integer, example: 1 }
 *               features: { type: object, example: { max_declarations: 100 } }
 *               is_featured: { type: boolean, example: true }
 *               is_active: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Forfait mis à jour
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "premium", name: "Premium+", price: 7500 }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Forfait introuvable
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', authMiddleware, adminMiddleware, updatePlan);

/**
 * @swagger
 * /plans:
 *   post:
 *     summary: Créer un nouveau forfait (Admin)
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, currency, duration_months]
 *             properties:
 *               name: { type: string, example: "Pro" }
 *               price: { type: number, example: 10000 }
 *               currency: { type: string, example: "FCFA" }
 *               duration_months: { type: integer, example: 12 }
 *               features: { type: object, example: { max_declarations: 200, max_shares: 50 } }
 *               is_featured: { type: boolean, example: false }
 *               is_active: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Forfait créé avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "pro", name: "Pro", price: 10000 }
 *       400:
 *         description: Champs requis manquants
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.post('/', authMiddleware, adminMiddleware, createPlan);

export default router;
