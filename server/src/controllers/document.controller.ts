 import { Request, Response } from 'express';
import { DocumentService } from '../services/document.service.ts';
import { subscriptionService } from '../services/subscription.service.ts';
import { readFileAsBase64, fileExists, toDataUrl } from '../utils/media.utils.ts';

const documentService = new DocumentService();

export const registerMyDocument = async (req: Request, res: Response) => {
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

    // Handle uploaded files (prefer multer files, fallback to body URLs)
    const photo_recto = files?.photo_recto?.[0]?.path || data.photo_recto || null;
    const photo_verso = files?.photo_verso?.[0]?.path || data.photo_verso || null;

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

    const result = await documentService.registerUserDocument({
      ...data,
      user_id: userId,
      photo_recto,
      photo_verso
    });

    res.status(201).json({
      success: true,
      message: 'Document personnel enregistré avec succès',
      data: result
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'enregistrement du document:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'enregistrement du document'
    });
  }
};

export const getMyDocuments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const result = await documentService.getUserDocuments(userId);
    const count = result.length;

    res.json({
      success: true,
      count: count,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des documents'
    });
  }
};

export const getMyDocumentById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
    }

    const doc = await documentService.getDocumentById(docId);
    if (!doc || doc.user_id !== userId) {
      return res.status(404).json({ success: false, message: 'Document introuvable ou accès non autorisé' });
    }

    res.json({ success: true, data: doc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de la récupération du document' });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
  const id = req.params.id as string;
  const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const success = await documentService.deleteDocument(id, userId);

    if (success) {
      res.json({
        success: true,
        message: 'Document supprimé avec succès'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé ou accès non autorisé'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression'
    });
  }
};

export const reportDocumentLost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await documentService.reportDocumentLost(docId, userId, password);

    res.json({
      success: true,
      message: 'Document déclaré comme perdu avec succès',
      data: result
    });
  } catch (error: any) {
    console.error('❌ Erreur déclaration perte:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la déclaration de perte'
    });
  }
};

/**
 * Archive a single document by id. Used by mobile to immediately archive
 * a document whose date_expiration has passed (avoids waiting for the 2 AM cron).
 */
export const archiveDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
    }
    const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const doc = await documentService.archiveDocument(docId, userId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document introuvable ou accès non autorisé' });
    }
    res.json({
      success: true,
      message: 'Document archivé',
      data: doc
    });
  } catch (error: any) {
    console.error('❌ Erreur archivage document:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de l\'archivage' });
  }
};

export const getDocumentMedia = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;
    const field = (req.query.field as string) || 'photo_recto';

    if (!userId) return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });

    const doc = await documentService.getDocumentById(id, { encode: false });
    if (!doc || doc.user_id !== userId) return res.status(404).json({ success: false, message: 'Document introuvable ou accès refusé' });

    const candidate = field === 'photo_verso' ? doc.photo_verso : doc.photo_recto;
    if (!candidate) return res.status(404).json({ success: false, message: 'Média introuvable' });

    const exists = await fileExists(candidate);
    if (!exists) return res.status(404).json({ success: false, message: 'Fichier absent sur le serveur' });

    const file = await readFileAsBase64(candidate);
    if (!file) {
      return res.status(500).json({ success: false, message: 'Impossible de lire le média demandé' });
    }

    return res.json({ success: true, data: { filename: file.filename, mime: file.mime, base64: file.base64, dataUrl: toDataUrl(file.base64, file.mime) } });
  } catch (error: any) {
    console.error('❌ Erreur getDocumentMedia:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de la récupération du média' });
  }
};

