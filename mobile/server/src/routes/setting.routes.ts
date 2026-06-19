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

router.post('/:key', SettingController.updateSetting);

export default router;
