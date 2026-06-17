import { Router } from 'express';
import * as SettingController from '../controllers/setting.controller.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Paramètres globaux de l'application
 */

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Récupérer tous les paramètres publics
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Paramètres récupérés
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { min_withdrawal: 5000, referral_reward_points: 50 }
 */
router.get('/', SettingController.getSettings);

/**
 * @swagger
 * /settings/{key}:
 *   get:
 *     summary: Récupérer un paramètre par sa clé
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *     responses:
 *       200:
 *         description: Valeur du paramètre
 */
router.get('/:key', SettingController.getSettingByKey);

/**
 * @swagger
 * /settings/{key}:
 *   post:
 *     summary: Créer ou mettre à jour un paramètre (Admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Clé du paramètre
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: { type: string, example: "5000", description: "Valeur du paramètre" }
 *     responses:
 *       200:
 *         description: Paramètre mis à jour avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { key: "min_withdrawal", value: "5000" }
 *       400:
 *         description: Valeur manquante
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.post('/:key', SettingController.updateSetting);

export default router;
