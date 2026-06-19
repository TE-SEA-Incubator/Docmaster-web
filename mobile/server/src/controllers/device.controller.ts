import { Request, Response } from 'express';
import path from 'path';
import { deviceService } from '../services/device.service.ts';
import { subscriptionService } from '../services/subscription.service.ts';
import { readFileAsBase64, fileExists, toDataUrl } from '../utils/media.utils.ts';

export const registerMyDevice = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const userId = (req as any).user?.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    // Extract paths from multiple files
    const photos: string[] = [];
    if (files?.photo_facture?.[0]) photos.push(files.photo_facture[0].path);
    if (files?.photo_face?.[0]) photos.push(files.photo_face[0].path);
    if (files?.photo_serial?.[0]) photos.push(files.photo_serial[0].path);

    // 1. Validate subscription limits
    const validation = await subscriptionService.validateAction(userId, 'REGISTER_OBJECT');

    if (!(validation as any).allowed) {
      return res.status(403).json({
        success: false,
        message: (validation as any).reason,
        limit: (validation as any).limit,
        current: (validation as any).current
      });
    }

    // Log incoming device registration request (avoid logging file binaries)
    try {
      console.log('📥 [Controller] registerMyDevice request from user:', userId, {
        brand: data.brand,
        model: data.model,
        serial: data.serial_number_imei,
        color: data.color,
        assurance: data.assurance,
        purchase_date: data.purchase_date
      });
      console.log('📁 [Controller] attached photos count:', Object.keys(files || {}).reduce((c, k) => c + (files[k]?.length || 0), 0));
    } catch (e) {
      console.warn('Failed to log registerMyDevice payload summary', e);
    }

    const result = await deviceService.registerDevice({
      ...data,
      user_id: userId,
      photos
    });

    res.status(201).json({
      success: true,
      message: 'Appareil enregistré avec succès',
      data: result
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'enregistrement de l\'appareil:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'enregistrement de l\'appareil'
    });
  }
};

export const updateMyDevice = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const userId = (req as any).user?.id;
    const id = req.params.id as string;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const result = await deviceService.updateDevice(id, userId, {
      ...data,
      user_id: userId,
      uploadedPhotos: {
        photo_facture: files?.photo_facture?.map(file => file.path) || [],
        photo_face: files?.photo_face?.map(file => file.path) || [],
        photo_serial: files?.photo_serial?.map(file => file.path) || []
      }
    } as any);

    res.json({
      success: true,
      message: 'Appareil modifié avec succès',
      data: result
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la modification de l\'appareil:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la modification de l\'appareil'
    });
  }
};

export const getMyDevices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const result = await deviceService.getUserDevices(userId);

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des appareils'
    });
  }
};

export const getDeviceMedia = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;
    const field = (req.query.field as string) || 'photo_facture';

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
    }

    const device = await deviceService.getDeviceById(id, { encode: false });
    if (!device || device.user_id !== userId) {
      return res.status(404).json({ success: false, message: 'Appareil non trouvé ou accès refusé' });
    }

    const photos: string[] = Array.isArray((device as any).photos)
      ? (device as any).photos
      : (() => { try { return JSON.parse((device as any).photos || '[]'); } catch { return []; } })();

    const resolveByField = (requestedField: string) => {
      const normalized = requestedField.toLowerCase();

      // Try to find by filename prefix first (photo_facture-, photo_face-, photo_serial-)
      const byPrefix = photos.find(p => path.basename(p).toLowerCase().startsWith(`${normalized}-`));
      if (byPrefix) return byPrefix;

      // Then try positional fallback for legacy records
      const idxMap: Record<string, number> = { photo_facture: 0, photo_face: 1, photo_serial: 2 };
      const idx = idxMap[normalized];
      if (typeof idx === 'number' && photos[idx]) return photos[idx];

      // If the requested slot is missing but there is only one media file, use it.
      if (photos.length === 1) return photos[0];

      // If the requested field is missing but one of the other media files exists, return the first available.
      return photos[0] || null;
    };

    // Try to find the best matching media for the requested field
    const lowerField = field.toLowerCase();
    const selected = resolveByField(lowerField);

    if (!selected) {
      return res.status(404).json({ success: false, message: 'Média introuvable pour le champ demandé' });
    }

    const exists = await fileExists(selected);
    if (!exists) return res.status(404).json({ success: false, message: 'Fichier absent sur le serveur' });

    const file = await readFileAsBase64(selected);
    if (!file) {
      return res.status(500).json({ success: false, message: 'Impossible de lire le média demandé' });
    }

    return res.json({ success: true, data: { filename: file.filename, mime: file.mime, base64: file.base64, dataUrl: toDataUrl(file.base64, file.mime) } });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération du média:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de la récupération du média' });
  }
};

export const reportDeviceLost = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const { password, status } = req.body;
    const result = await deviceService.reportLost(id, userId, password, status);

    res.json({
      success: true,
      message: 'Appareil déclaré comme perdu',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la déclaration de perte'
    });
  }
};

export const reportDeviceFound = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const { password } = req.body;
    const result = await deviceService.reportFound(id, userId, password);

    res.json({
      success: true,
      message: 'Appareil marqué comme sécurisé',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour du statut'
    });
  }
};

export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const result = await deviceService.deleteDevice(id, userId);

    if (result) {
      res.json({
        success: true,
        message: 'Appareil supprimé avec succès'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Appareil non trouvé ou accès non autorisé'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression'
    });
  }
};

export const verifyDevice = async (req: Request, res: Response) => {
  try {
    const identifier = req.params.identifier as string;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant (IMEI/Serial) requis'
      });
    }

    const result = await deviceService.verifyDevice(identifier);

    if (result) {
      res.json({
        success: true,
        message: 'Appareil trouvé dans la base de données',
        data: result
      });
    } else {
      res.json({
        success: false,
        message: 'Aucun appareil correspondant trouvé dans notre base de données sécurisée',
        data: null
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la vérification'
    });
  }
};
