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

    // 🔥 CONTOURNEMENT MANUEL & SÉCURISÉ DE FOUND_LOCATION
    if (req.body.found_location) {
      if (typeof req.body.found_location === 'string') {
        try {
          req.body.found_location = JSON.parse(req.body.found_location);
        } catch (e) {
          console.error('❌ Erreur parsing found_location manuel (Lost):', e);
          req.body.found_location = undefined;
        }
      }

      if (req.body.found_location && typeof req.body.found_location === 'object') {
        const loc = req.body.found_location;
        if (loc.lng && !loc.long) loc.long = loc.lng;
        if (loc.lat) loc.lat = parseFloat(loc.lat);
        if (loc.long) loc.long = parseFloat(loc.long);
      }
    }

    // Extract files
    const photo_recto = files?.photo_recto?.[0]?.path;
    const photo_verso = files?.photo_verso?.[0]?.path;

    // 1. Validate subscription limits
    const validation = await subscriptionService.validateAction(userId, 'CREATE_DECLARATION', { 
      docTypeId: req.body.doc_type 
    });

    if (!(validation as any).allowed) {
      return res.status(403).json({
        success: false,
        message: (validation as any).reason,
        limit: (validation as any).limit,
        current: (validation as any).current
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
    if ((validation as any).useBenefit) {
      await subscriptionService.consumeBenefit((validation as any).subscriptionId, 'declaration');
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
    console.log('🔵 [Controller] === DÉBUT createFoundDeclaration ===');
    
    const userId = (req as any).user?.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    console.log('🔵 [Controller] userId:', userId);
    console.log('🔵 [Controller] files reçus:', files ? Object.keys(files) : 'aucun');

    if (!userId) {
      console.log('🔴 [Controller] Pas de userId - non authentifié');
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    // Afficher le body brut reçu
    console.log('🔵 [Controller] req.body (brut):', JSON.stringify(req.body, null, 2));

    // Validate DTO
    console.log('🔵 [Controller] Validation DTO...');
    const validationErrors = await validateDTO(req.body, CreateDeclarationDTO);
    if (validationErrors) {
      console.log('🔴 [Controller] Erreurs validation DTO:', JSON.stringify(validationErrors, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Validation échouée',
        errors: validationErrors
      });
    }
    console.log('🟢 [Controller] Validation DTO OK');

    // 🔥 CONTOURNEMENT MANUEL & SÉCURISÉ DE FOUND_LOCATION
    if (req.body.found_location) {
      if (typeof req.body.found_location === 'string') {
        try {
          req.body.found_location = JSON.parse(req.body.found_location);
          console.log('🟢 [Controller] found_location parsé manuellement avec succès');
        } catch (e) {
          console.error('❌ [Controller] Erreur parsing found_location manuel:', e);
          req.body.found_location = undefined;
        }
      }

      // Nettoyage et uniformisation des types de l'objet de géolocalisation
      if (req.body.found_location && typeof req.body.found_location === 'object') {
        const loc = req.body.found_location;
        if (loc.lng && !loc.long) loc.long = loc.lng;
        if (loc.lat) loc.lat = parseFloat(loc.lat);
        if (loc.long) loc.long = parseFloat(loc.long);
        
        // Validation basique de secours
        if (!loc.city || isNaN(loc.lat) || isNaN(loc.long)) {
          console.log('🔴 [Controller] Échec validation manuelle de found_location structure');
          return res.status(400).json({
            success: false,
            message: 'Validation échouée',
            errors: { "found_location": ["La localisation est mal formée (city, lat et long requis)"] }
          });
        }
      }
    }

    // Extract files
    const photo_recto = files?.photo_recto?.[0]?.path;
    const photo_verso = files?.photo_verso?.[0]?.path;
    console.log('🟢 [Controller] Photos:', { photo_recto, photo_verso });

    // 1. Validate subscription limits
    console.log('🔵 [Controller] Vérification abonnement...');
    console.log('🔵 [Controller] Paramètres:', { userId, docTypeId: req.body.doc_type });
    
    const validation = await subscriptionService.validateAction(userId, 'CREATE_DECLARATION', { 
      docTypeId: req.body.doc_type 
    });
    
    console.log('🟢 [Controller] Résultat validation abonnement:', JSON.stringify(validation, null, 2));

    if (!(validation as any).allowed) {
      console.log('🔴 [Controller] Abonnement: action non autorisée -', (validation as any).reason);
      return res.status(403).json({
        success: false,
        message: (validation as any).reason,
        limit: (validation as any).limit,
        current: (validation as any).current
      });
    }
    console.log('🟢 [Controller] Abonnement validé');

    // Appel au service
    console.log('🔵 [Controller] Appel declarationService.createDeclaration...');
    
    const result = await declarationService.createDeclaration({
      ...req.body,
      declaration_type: 'FOUND',
      reporter_id: userId,
      photo_recto,
      photo_verso
    });

    console.log('🟢 [Controller] Déclaration créée avec succès, ID:', result.id);

    // 2. Consume referral benefit if used
    if ((validation as any).useBenefit) {
      console.log('🔵 [Controller] Consommation bénéfice...');
      await subscriptionService.consumeBenefit((validation as any).subscriptionId, 'declaration');
      console.log('🟢 [Controller] Bénéfice consommé');
    }

    console.log('✅ [Controller] === FIN SUCCÈS ===');
    res.status(201).json({
      success: true,
      message: 'Déclaration de document trouvé enregistrée',
      data: result
    });
  } catch (error: any) {
    console.error('🔴 [Controller] === ERREUR ===');
    console.error('🔴 [Controller] Message:', error.message);
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
    const filters: any = { ...req.query };
    const user = (req as any).user;
    if (user?.role === 'ADMIN') {
      filters.include_all = true;
    }
    const result = await declarationService.searchDeclarations(filters);
    res.json({ success: true, count: result.data.length, total: result.total, data: result.data });
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
    // Let the service decide what to do when `q` is empty.
    // service.searchPublicFound handles empty queries by returning all AVAILABLE FOUND declarations.
    const result = await declarationService.searchPublicFound((q as string) || "");
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

    // Admins see full details; otherwise, require an active LOST declaration
    const user = (req as any).user;
    const userId = user?.id;
    if (user?.role === 'ADMIN') {
      return res.json({ success: true, data: result });
    }
    if (userId) {
      // Fetch user's declarations and check for an active LOST
      const myDecls = await declarationService.getUserDeclarations(userId);
      const hasActiveLost = Array.isArray(myDecls) && myDecls.some((d: any) => d.declaration_type === 'LOST' && !['RETURNED','CANCELLED','CLAIMED'].includes(d.status));
      if (hasActiveLost) {
        return res.json({ success: true, data: result });
      }
    }

    // Otherwise return a minimal masked response
    const maskName = (name: string) => {
      if (!name) return '***';
      return name.split(' ').map((p: string) => (p.length > 1 ? p[0] + '*'.repeat(p.length - 1) : p + '*')).join(' ');
    };

    const minimal = {
      id: result.id,
      doc_type: result.doc_type,
      owner_name: maskName(result.owner_name),
      // prefer specific date fields used by frontend
      date: result.date_trouvaille || result.date_perte || result.created_at || null
    };

    res.json({ success: true, data: minimal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const initiateRecovery = async (req: Request, res: Response) => {
  try {
    const id = (req.params.id || req.body.declaration_id) as string;
    const { amount, method, phone } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID de déclaration requis' });
    }

    const result = await declarationService.initiateRecovery(id, userId, Number(amount), method, phone);
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

export const deleteDeclaration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const result = await declarationService.deleteDeclaration(id as string, userId);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Erreur suppression déclaration:', error);
    if (error.message === 'Déclaration introuvable') {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === 'Action non autorisée') {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === 'Déclaration déjà supprimée') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
