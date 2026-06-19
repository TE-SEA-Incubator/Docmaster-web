import { Router } from 'express';
import { 
  registerMyDevice, 
  getMyDevices,
  getDeviceById,
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

/**
 * @swagger
 * /devices/my-devices:
 *   post:
 *     summary: Enregistrer un nouvel appareil (alias de POST /devices)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [brand, model]
 *             properties:
 *               brand: { type: string, example: "Samsung" }
 *               model: { type: string, example: "Galaxy S21" }
 *               color: { type: string, example: "Noir" }
 *               serial_number_imei: { type: string, example: "353456789012345" }
 *               assurance: { type: string, example: "AXA Cameroun" }
 *               purchase_date: { type: string, format: date, example: "2024-01-15" }
 *               photo_facture: { type: string, format: binary }
 *               photo_face: { type: string, format: binary }
 *               photo_serial: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Appareil enregistré avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", brand: "Samsung", model: "Galaxy S21", status: "SAFE" }
 *       400:
 *         description: Champs requis manquants
 *         content:
 *           application/json:
 *             example: { success: false, message: "Le champ brand est requis" }
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/my-devices', authMiddleware, upload.fields([
  { name: 'photo_facture', maxCount: 1 },
  { name: 'photo_face', maxCount: 1 },
  { name: 'photo_serial', maxCount: 1 }
]), registerMyDevice);

/**
 * @swagger
 * /devices/{id}:
 *   put:
 *     summary: Mettre à jour un appareil existant
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de l'appareil
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               brand: { type: string, example: "Samsung" }
 *               model: { type: string, example: "Galaxy S21 Ultra" }
 *               color: { type: string, example: "Bleu" }
 *               serial_number_imei: { type: string, example: "353456789012345" }
 *               assurance: { type: string, example: "AXA Cameroun" }
 *               purchase_date: { type: string, format: date }
 *               photo_facture: { type: string, format: binary }
 *               photo_face: { type: string, format: binary }
 *               photo_serial: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Appareil mis à jour avec succès
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", brand: "Samsung", model: "Galaxy S21 Ultra" }
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Appareil introuvable
 *         content:
 *           application/json:
 *             example: { success: false, message: "Appareil non trouvé" }
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', authMiddleware, upload.fields([
  { name: 'photo_facture', maxCount: 1 },
  { name: 'photo_face', maxCount: 1 },
  { name: 'photo_serial', maxCount: 1 }
]), updateMyDevice);

/**
 * @swagger
 * /devices/{id}/media:
 *   get:
 *     summary: Récupérer le média (photo) d'un appareil en base64
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de l'appareil
 *       - in: query
 *         name: field
 *         required: true
 *         schema:
 *           type: string
 *           enum: [photo_facture, photo_face, photo_serial]
 *         description: Nom du champ média à récupérer
 *     responses:
 *       200:
 *         description: Média encodé en base64
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { field: "photo_facture", data: "data:image/jpeg;base64,/9j/4AAQ..." }
 *       400:
 *         description: Champ invalide
 *         content:
 *           application/json:
 *             example: { success: false, message: "Champ invalide" }
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Appareil ou média introuvable
 *       500:
 *         description: Erreur serveur
 */
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
/**
 * @swagger
 * /devices/my-devices:
 *   get:
 *     summary: Lister mes appareils (alias de GET /devices)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des appareils récupérée
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   brand: "Samsung"
 *                   model: "Galaxy S21"
 *                   color: "Noir"
 *                   serial_number_imei: "353456789012345"
 *                   status: "SAFE"
 *                   created_at: "2024-06-15T10:00:00Z"
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/my-devices', authMiddleware, getMyDevices);

/**
 * @swagger
 * /devices/{id}:
 *   get:
 *     summary: Récupérer un appareil par son ID
 *     tags: [Devices]
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
 *         description: Appareil trouvé
 *       404:
 *         description: Appareil introuvable
 */
router.get('/:id', authMiddleware, getDeviceById);

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
/**
 * @swagger
 * /devices/{id}/report-lost:
 *   patch:
 *     summary: Déclarer un appareil comme perdu (alias)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de l'appareil
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: "Volé dans le métro" }
 *               location: { type: string, example: "Station Bastos, Yaoundé" }
 *     responses:
 *       200:
 *         description: Statut mis à jour en LOST
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Appareil déclaré comme perdu"
 *               data: { id: "uuid", status: "LOST" }
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Appareil introuvable
 *       500:
 *         description: Erreur serveur
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
/**
 * @swagger
 * /devices/{id}/report-found:
 *   patch:
 *     summary: Déclarer un appareil comme retrouvé (alias)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant UUID de l'appareil
 *     responses:
 *       200:
 *         description: Statut mis à jour en FOUND
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Appareil déclaré comme retrouvé"
 *               data: { id: "uuid", status: "FOUND" }
 *       401:
 *         description: Non authentifié
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
