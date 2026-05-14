import { Request, Response } from 'express';
import { DocumentService } from '../services/document.service.ts';
import { subscriptionService } from '../services/subscription.service.ts';

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

    // Handle uploaded files
    const photo_recto = files?.photo_recto?.[0]?.path;
    const photo_verso = files?.photo_verso?.[0]?.path;

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

    const result = await documentService.reportDocumentLost(id, userId, password);

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

