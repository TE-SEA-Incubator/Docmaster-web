import { Request, Response } from 'express';
import { deviceService } from '../services/device.service.ts';
import { subscriptionService } from '../services/subscription.service.ts';

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

    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        message: validation.reason,
        limit: validation.limit,
        current: validation.current
      });
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
