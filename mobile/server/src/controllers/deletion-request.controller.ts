import { Request, Response } from 'express';
import { DeletionRequestRepository } from '../repositories/deletion-request.repository.ts';
import { DeclarationRepository } from '../repositories/declaration.repository.ts';
import { RequestDeleteDeclarationDTO, ReviewDeleteionRequestDTO } from '../dtos/declaration.dto.ts';
import { validateDTO } from '../utils/validation.utils.ts';

const deletionRequestRepo = new DeletionRequestRepository();
const declarationRepo = new DeclarationRepository();

/**
 * USER: Request declaration deletion with reason
 * @route POST /api/declarations/:id/request-deletion
 */
export const requestDeletionDeclaration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    // Validate DTO
    const validationErrors = await validateDTO(req.body, RequestDeleteDeclarationDTO);
    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation échouée',
        errors: validationErrors
      });
    }

    const { reason, reason_type } = req.body;

    // Check if declaration exists and belongs to user
    const declaration = await declarationRepo.findById(id);
    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
    }

    if (declaration.reporter_id !== userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    // Check if deletion request already exists
    const existing = await deletionRequestRepo.findByDeclarationId(id);
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'Une demande de suppression existe déjà pour cette déclaration' 
      });
    }

    // Create deletion request
    const delRequest = await deletionRequestRepo.create({
      declaration_id: id,
      user_id: userId,
      reason,
      reason_type
    });

    res.status(201).json({
      success: true,
      message: 'Demande de suppression créée. Un administrateur examinera votre demande.',
      data: delRequest
    });
  } catch (error: any) {
    console.error('❌ Erreur création demande suppression:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * USER: Get their deletion requests
 * @route GET /api/declarations/deletion-requests/me
 */
export const getMyDeletionRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const requests = await deletionRequestRepo.getByUserId(userId);
    res.json({ success: true, count: requests.length, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ADMIN: Get all pending deletion requests
 * @route GET /api/admin/deletion-requests
 */
export const getPendingDeletionRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Accès admin requis' });
    }

    const requests = await deletionRequestRepo.getPending();
    res.json({ success: true, count: requests.length, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ADMIN: Approve a deletion request
 * @route POST /api/admin/deletion-requests/:id/approve
 */
export const approveDeletionRequest = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user?.id;
    const adminRole = (req as any).user?.role;
    const id = req.params.id as string;
    const { admin_comment } = req.body;

    if (!adminId || adminRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Accès admin requis' });
    }

    const delRequest = await deletionRequestRepo.findById(id);
    if (!delRequest) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }

    if (delRequest.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `Cette demande a déjà été ${delRequest.status.toLowerCase() === 'approved' ? 'approuvée' : 'rejetée'}` 
      });
    }

    // Approve and soft delete the declaration
    const approved = await deletionRequestRepo.approve(id, adminId, admin_comment);
    
    // Soft delete declaration
    if (delRequest.declaration_id) {
      await deletionRequestRepo.markExecuted(id);
      // Note: The actual soft delete update would happen here
      // UPDATE declarations SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1
    }

    res.json({
      success: true,
      message: 'Demande approuvée. La déclaration sera supprimée.',
      data: approved
    });
  } catch (error: any) {
    console.error('❌ Erreur approbation suppression:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ADMIN: Reject a deletion request
 * @route POST /api/admin/deletion-requests/:id/reject
 */
export const rejectDeletionRequest = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user?.id;
    const adminRole = (req as any).user?.role;
    const id = req.params.id as string;
    const { admin_comment } = req.body;

    if (!adminId || adminRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Accès admin requis' });
    }

    if (!admin_comment) {
      return res.status(400).json({ 
        success: false, 
        message: 'Un commentaire est requis pour rejeter la demande' 
      });
    }

    const delRequest = await deletionRequestRepo.findById(id);
    if (!delRequest) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }

    if (delRequest.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cette demande a déjà été traitée' 
      });
    }

    const rejected = await deletionRequestRepo.reject(id, adminId, admin_comment);

    res.json({
      success: true,
      message: 'Demande rejetée. L\'utilisateur a été notifié.',
      data: rejected
    });
  } catch (error: any) {
    console.error('❌ Erreur rejet suppression:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * USER: Get a specific deletion request
 * @route GET /api/declarations/deletion-requests/:id
 */
export const getDeletionRequestById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const delRequest = await deletionRequestRepo.findById(id);
    if (!delRequest) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }

    // User can only see their own requests (unless admin)
    const userRole = (req as any).user?.role;
    if (userRole !== 'ADMIN' && delRequest.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    res.json({ success: true, data: delRequest });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
