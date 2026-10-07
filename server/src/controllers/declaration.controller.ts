import { Request, Response } from 'express';
import { DeclarationService } from '../services/declaration.service.ts';
import { PdfService } from '../services/pdf.service.ts';
import { activityLogService } from '../services/activity-log.service.ts';
import { CreateDeclarationDTO, RequestDeleteDeclarationDTO, UpdateDeclarationDTO } from '../dtos/declaration.dto.ts';
import { validateDTO, mapFormDataToObject, formatValidationErrors } from '../utils/validation.utils.ts';
import { DocumentRepository } from '../repositories/document.repository.ts';
import { DocumentDeclaration } from '../types/database.ts';
import pool from '../database/db.js';

const declarationService = new DeclarationService();
const pdfService = new PdfService();
const documentRepository = new DocumentRepository();

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

    // Parse metadata from FormData JSON string
    if (req.body.metadata && typeof req.body.metadata === 'string') {
      try {
        req.body.metadata = JSON.parse(req.body.metadata);
      } catch (e) {
        console.error('❌ Erreur parsing metadata (Lost):', e);
        req.body.metadata = undefined;
      }
    }

    // Extract files
    const photo_recto = files?.photo_recto?.[0]?.path;
    const photo_verso = files?.photo_verso?.[0]?.path;

    const result = await declarationService.createDeclaration({
      ...req.body,
      declaration_type: 'LOST',
      reporter_id: userId,
      photo_recto,
      photo_verso
    });

    // Link wallet document if provided
    const sourceDocumentId = req.body.source_document_id;
    if (sourceDocumentId && typeof sourceDocumentId === 'string') {
      // Attendu : sans await, le client affiche « document perdu » alors que l'écriture
      // n'est pas encore passée, et son rechargement peut relire l'ancien état.
      try {
        await documentRepository.updateLostStatus(sourceDocumentId, userId, true, result.id);
      } catch (e) {
        console.error('⚠️ Could not link declaration to wallet document:', e);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Déclaration de perte enregistrée',
      data: result
    });

    activityLogService.log({
      user_id: userId,
      action_type: 'CREATE_DECLARATION',
      entity_type: 'declaration',
      entity_id: result.id,
      description: `Déclaration de perte (${req.body.doc_type || 'inconnu'})`,
      metadata: { declaration_type: 'LOST', doc_type: req.body.doc_type },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch(() => {});
  } catch (error: any) {
    console.error('❌ Erreur création déclaration perte:', error);
    const msg = error.message || '';
    const status = msg.includes('Limite') || msg.includes('plan') ? 403 : 500;
    res.status(status).json({ success: false, message: msg });
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

    // Parse metadata from FormData JSON string
    if (req.body.metadata && typeof req.body.metadata === 'string') {
      try {
        req.body.metadata = JSON.parse(req.body.metadata);
        console.log('🟢 [Controller] metadata parsé avec succès');
      } catch (e) {
        console.error('❌ [Controller] Erreur parsing metadata:', e);
        req.body.metadata = undefined;
      }
    }

    // Extract files
    const photo_recto = files?.photo_recto?.[0]?.path;
    const photo_verso = files?.photo_verso?.[0]?.path;
    console.log('🟢 [Controller] Photos:', { photo_recto, photo_verso });

    const result = await declarationService.createDeclaration({
      ...req.body,
      declaration_type: 'FOUND',
      reporter_id: userId,
      photo_recto,
      photo_verso
    });
    res.status(201).json({
      success: true,
      message: 'Déclaration de document trouvé enregistrée',
      data: result
    });

    activityLogService.log({
      user_id: userId,
      action_type: 'CREATE_DECLARATION',
      entity_type: 'declaration',
      entity_id: result.id,
      description: `Déclaration de document trouvé (${req.body.doc_type || 'inconnu'})`,
      metadata: { declaration_type: 'FOUND', doc_type: req.body.doc_type },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch(() => {});
  } catch (error: any) {
    console.error('🔴 [Controller] === ERREUR ===');
    console.error('🔴 [Controller] Message:', error.message);
    const msg = error.message || '';
    const status = msg.includes('Limite') || msg.includes('plan') ? 403 : 500;
    res.status(status).json({ success: false, message: msg });
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

export const getStatsByType = async (req: Request, res: Response) => {
  try {
    const { period } = req.query; // day, week, month, year
    const stats = await declarationService.getStatsByType((period as string) || "month");
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('❌ [getStatsByType] ERREUR:', error.message);
    console.error('❌ [getStatsByType] Stack:', error.stack);
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
    const result = await declarationService.getDeclarationById(id as string);
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
      const isReporter = result.reporter_id === userId;
      const isCounterPart =
        result.counterPart?.id === userId ||
        result.counterPartDeclaration?.reporter_id === userId;
      const matches = result.matches || [];
      const isInMatch = matches.some(
        (m: any) =>
          m.lost_declaration_id === id ||
          m.found_declaration_id === id ||
          m.lost_declaration_id === result.id ||
          m.found_declaration_id === result.id
      );
      if (isReporter || isCounterPart || isInMatch) {
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
      date: result.date_trouvaille || result.date_perte || result.created_at || null,
      ville: result.ville,
      photo_recto: result.photo_recto || null,
      has_photo: Boolean(result.photo_recto),
    };

    res.json({ success: true, data: minimal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRenderContext = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const preferredFoundId = typeof req.query.found === 'string' ? req.query.found : undefined;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const result = await declarationService.getDeclarationById(id as string, { preferredMatchFoundId: preferredFoundId });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
    }

    const isReporter = result.reporter_id === userId;
    const isCounterPartReporter = result.counterPart?.id === userId;
    const canAccess = isReporter
      || isCounterPartReporter
      || await declarationService.userCanAccessRenderContext(userId, result);

    if (!canAccess && (req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('❌ Erreur getRenderContext:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const validateRecovery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    if (!code) {
      return res.status(400).json({ success: false, message: 'Code de validation requis' });
    }

    const result = await declarationService.validateRecovery(id as string, userId, code);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Erreur validateRecovery:', error);
    res.status(400).json({ success: false, message: error.message });
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
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const declaration = await declarationService.getDeclarationById(id as string);
    
    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
    }

    const isReporter = declaration.reporter_id === userId;
    const isCounterPart = declaration.counterPart?.id === userId;
    if (!isReporter && !isCounterPart && userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Action non autorisée' });
    }

    // Enrichir avec le nom de l'autorité certificateur (pour le cachet de certification)
    if (declaration.is_certified && declaration.certified_by) {
      try {
        const cert = await pool.query(
          'SELECT nom, prenom FROM autorites WHERE id = $1',
          [declaration.certified_by]
        );
        if (cert.rows[0]) {
          declaration.certified_by_name = `${cert.rows[0].prenom} ${cert.rows[0].nom}`;
        }
      } catch (err: any) {
        console.error('❌ Erreur récupération certificateur:', err.message);
      }
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

// status, doc_type et transactions_id sont volontairement hors liste : l'état d'une
// déclaration s'accorde par les parcours dédiés (matching, récupération, paiement),
// un PATCH ne doit pas permettre à un client de se déclarer lui-même « restitué ».
const UPDATABLE_DECLARATION_FIELDS: (keyof UpdateDeclarationDTO)[] = [
  'owner_name',
  'document_number',
  'ville',
  'pays',
  'region',
  'quartier',
  'description',
  'etat_physique',
  'urgence_niveau',
  'recompense_montant',
  'mode_contact',
  'telephone_contact',
  'email_contact',
  'date_expiration',
  'date_perte',
  'date_naissance',
  'found_location',
];

export const updateDeclaration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const validationErrors = await validateDTO(req.body, UpdateDeclarationDTO);
    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation échouée',
        errors: validationErrors,
      });
    }

    const data: Partial<DocumentDeclaration> = {};
    for (const field of UPDATABLE_DECLARATION_FIELDS) {
      if (req.body[field] !== undefined) {
        (data as any)[field] = req.body[field];
      }
    }

    // Le formulaire est envoyé en JSON par le web, en chaîne par les clients qui
    // sérialisent à la main ; le repository re- stringify, donc on normalise ici.
    if (typeof (data as any).found_location === 'string') {
      try {
        (data as any).found_location = JSON.parse((data as any).found_location);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Validation échouée',
          errors: { found_location: ['found_location doit être un objet JSON'] },
        });
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun champ modifiable dans la requête',
      });
    }

    const updated = await declarationService.updateDeclaration(
      id as string,
      userId,
      data,
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Déclaration introuvable ou non autorisée',
      });
    }

    activityLogService.log({
      user_id: userId,
      action_type: 'UPDATE_DECLARATION',
      entity_type: 'declaration',
      entity_id: id as string,
      description: `Complément de déclaration (${Object.keys(data).join(', ')})`,
      metadata: { fields: Object.keys(data) },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Déclaration mise à jour',
      data: updated,
    });
  } catch (error: any) {
    console.error('❌ Erreur mise à jour déclaration:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la déclaration',
    });
  }
};
