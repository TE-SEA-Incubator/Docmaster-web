import { Request, Response } from 'express';
import { DeclarationService } from '../services/declaration.service.ts';
import { PdfService } from '../services/pdf.service.ts';
import { subscriptionService } from '../services/subscription.service.ts';
import { CreateDeclarationDTO, RequestDeleteDeclarationDTO } from '../dtos/declaration.dto.ts';
import { validateDTO, mapFormDataToObject, formatValidationErrors } from '../utils/validation.utils.ts';

const declarationService = new DeclarationService();
const pdfService = new PdfService();

export const createLostDeclaration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    // Validate DTO
    const validationErrors = await validateDTO(req.body, CreateDeclarationDTO);
    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation échouée',
        errors: validationErrors
      });
    }

    // Extract files
    const photo_recto = files?.photo_recto?.[0]?.path;
    const photo_verso = files?.photo_verso?.[0]?.path;

    // 1. Validate subscription limits
    const validation = await subscriptionService.validateAction(userId, 'CREATE_DECLARATION', { 
      docTypeId: req.body.doc_type 
    });

    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        message: validation.reason,
        limit: validation.limit,
        current: validation.current
      });
    }

    const result = await declarationService.createDeclaration({
      ...req.body,
      declaration_type: 'LOST',
      reporter_id: userId,
      photo_recto,
      photo_verso
    });

    // 2. Consume referral benefit if used
    if (validation.useBenefit) {
      await subscriptionService.consumeBenefit(validation.subscriptionId, 'declaration');
    }

    res.status(201).json({
      success: true,
      message: 'Déclaration de perte enregistrée',
      data: result
    });
  } catch (error: any) {
    console.error('❌ Erreur création déclaration perte:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFoundDeclaration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    // Validate DTO
    const validationErrors = await validateDTO(req.body, CreateDeclarationDTO);
    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation échouée',
        errors: validationErrors
      });
    }

    // Extract files
    const photo_recto = files?.photo_recto?.[0]?.path;
    const photo_verso = files?.photo_verso?.[0]?.path;

    // 1. Validate subscription limits
    const validation = await subscriptionService.validateAction(userId, 'CREATE_DECLARATION', { 
      docTypeId: req.body.doc_type 
    });

    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        message: validation.reason,
        limit: validation.limit,
        current: validation.current
      });
    }

    const result = await declarationService.createDeclaration({
      ...req.body,
      declaration_type: 'FOUND',
      reporter_id: userId,
      photo_recto,
      photo_verso
    });

    // 2. Consume referral benefit if used
    if (validation.useBenefit) {
      await subscriptionService.consumeBenefit(validation.subscriptionId, 'declaration');
    }

    res.status(201).json({
      success: true,
      message: 'Déclaration de document trouvé enregistrée',
      data: result
    });
  } catch (error: any) {
    console.error('❌ Erreur création déclaration trouvaille:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyDeclarations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const result = await declarationService.getUserDeclarations(userId);
    res.json({ success: true, count: result.length, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const searchDeclarations = async (req: Request, res: Response) => {
  try {
    const filters = req.query;
    const result = await declarationService.searchDeclarations(filters);
    res.json({ success: true, count: result.length, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGlobalStats = async (req: Request, res: Response) => {
  try {
    const stats = await declarationService.getGlobalStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPerformanceStats = async (req: Request, res: Response) => {
  try {
    const { period } = req.query; // day, week, month, year
    const stats = await declarationService.getPerformanceStats(period as string);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const searchPublicFound = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }
    const result = await declarationService.searchPublicFound(q as string);
    res.json({ success: true, count: result.length, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeclarationById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = await declarationService.getDeclarationById(id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const initiateRecovery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, method } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const result = await declarationService.initiateRecovery(id as string, userId, Number(amount), method);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Erreur initiation récupération:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const generatePdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const declaration = await declarationService.getDeclarationById(id as string);
    
    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=declaration_${id}.pdf`);
    
    await pdfService.generateDeclarationPdf(declaration, res);
  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du PDF' });
  }
};
