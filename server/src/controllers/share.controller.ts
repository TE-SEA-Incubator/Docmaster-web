import { Request, Response } from 'express';
import { ShareService } from '../services/share.service.ts';

const shareService = new ShareService();

export const createShare = async (req: Request, res: Response) => {
  try {
    const documentId = req.params.documentId as string;
    const { daysValid } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const share = await shareService.createShareLink(documentId, userId, daysValid);
    
    // Construct the full URL (in production this should be based on config)
    const baseUrl = process.env.FRONTEND_URL || 'https://docmaster.net';
    const shareUrl = `${baseUrl}/partage?token=${share.share_token}`;

    res.status(201).json({
      success: true,
      data: {
        ...share,
        shareUrl
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSharedDocument = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const share = await shareService.getSharedDocument(token);

    if (!share) {
      return res.status(404).json({ success: false, message: 'Lien invalide ou expiré' });
    }

    res.json({
      success: true,
      data: share
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDocumentShares = async (req: Request, res: Response) => {
  try {
    const documentId = req.params.documentId as string;
    const userId = (req as any).user?.id;

    const shares = await shareService.getDocumentShares(documentId, userId);
    res.json({ success: true, data: shares });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const revokeShare = async (req: Request, res: Response) => {
  try {
    const shareId = req.params.shareId as string;
    const userId = (req as any).user?.id;

    const success = await shareService.revokeShare(shareId, userId);
    res.json({ success, message: success ? 'Lien révoqué' : 'Échec de la révocation' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
