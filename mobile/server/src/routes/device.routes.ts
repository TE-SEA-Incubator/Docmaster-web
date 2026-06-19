import { Router } from 'express';
import { 
  registerMyDevice, 
  getMyDevices,
  reportDeviceLost,
  reportDeviceFound,
  deleteDevice,
  verifyDevice,
  updateMyDevice,
  getDeviceMedia
} from '../controllers/device.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { upload } from '../utils/upload.utils.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Gestion des appareils (Téléphones, Laptops)
 */

/**
 * @swagger
 * /devices/verify/{identifier}:
 *   get:
 *     summary: Vérifier un appareil (Anti-recel)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Résultat de la vérification
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", brand: "Samsung", model: "S21", status: "LOST" }
 */
router.get('/verify/:identifier', authMiddleware, verifyDevice);

/**
 * @swagger
 * /devices:
 *   post:
 *     summary: Enregistrer un nouveau appareil
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               brand: { type: string, example: "Samsung" }
 *               model: { type: string, example: "S21" }
 *               photo_facture: { type: string, format: binary }
 *               photo_face: { type: string, format: binary }
 *               photo_serial: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Appareil enregistré
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", brand: "Samsung", model: "S21" }
 */
router.post('/', authMiddleware, upload.fields([
  { name: 'photo_facture', maxCount: 1 },
  { name: 'photo_face', maxCount: 1 },
  { name: 'photo_serial', maxCount: 1 }
]), registerMyDevice);

// Alias for registerMyDevice to match frontend
router.post('/my-devices', authMiddleware, upload.fields([
  { name: 'photo_facture', maxCount: 1 },
  { name: 'photo_face', maxCount: 1 },
  { name: 'photo_serial', maxCount: 1 }
]), registerMyDevice);

router.put('/:id', authMiddleware, upload.fields([
  { name: 'photo_facture', maxCount: 1 },
  { name: 'photo_face', maxCount: 1 },
  { name: 'photo_serial', maxCount: 1 }
]), updateMyDevice);

// Return encoded media (base64) for a device field (example: ?field=photo_facture)
router.get('/:id/media', authMiddleware, getDeviceMedia);

/**
 * @swagger
 * /devices:
 *   get:
 *     summary: Lister mes appareils
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: [{ id: "uuid", brand: "Samsung", model: "S21" }]
 */
router.get('/', authMiddleware, getMyDevices);
router.get('/my-devices', authMiddleware, getMyDevices);

/**
 * @swagger
 * /devices/{id}/lost:
 *   patch:
 *     summary: Déclarer un appareil perdu
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Statut mis à jour
 */
router.patch('/:id/lost', authMiddleware, reportDeviceLost);
router.patch('/:id/report-lost', authMiddleware, reportDeviceLost);

/**
 * @swagger
 * /devices/{id}/found:
 *   patch:
 *     summary: Déclarer un appareil retrouvé
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *         content:
 *           application/json:
 *             example: { success: true, message: "Appareil déclaré comme retrouvé" }
 *       404:
 *         description: Appareil introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/found', authMiddleware, reportDeviceFound);
router.patch('/:id/report-found', authMiddleware, reportDeviceFound);

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     summary: Supprimer un appareil
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Appareil supprimé
 *         content:
 *           application/json:
 *             example: { success: true, message: "Appareil supprimé avec succès" }
 *       404:
 *         description: Appareil introuvable
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authMiddleware, deleteDevice);

export default router;
