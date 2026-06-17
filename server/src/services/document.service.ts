import { DocumentRepository } from '../repositories/document.repository.ts';
import { UserDocument } from '../types/database.ts';
import { calculateDocumentFingerprint } from '../utils/crypto.utils.ts';
import { NotificationService } from './notification.service.ts';
import { subscriptionService } from './subscription.service.ts';
import { UserRepository } from '../repositories/auth.repository.ts';
import { DeclarationService } from './declaration.service.ts';
import argon2 from 'argon2';
import { encodeMediaFields } from '../utils/media.utils.ts';

export class DocumentService {
  private documentRepository: DocumentRepository;
  private notificationService: NotificationService;
  private userRepository: UserRepository;
  private declarationService: DeclarationService;

  constructor() {
    this.documentRepository = new DocumentRepository();
    this.notificationService = new NotificationService();
    this.userRepository = new UserRepository();
    this.declarationService = new DeclarationService();
  }

  /**
   * Register a user's own document
   */
  async registerUserDocument(data: Partial<UserDocument>): Promise<UserDocument> {
    // 0. Check Subscription Limits
    if (data.user_id) {
      const validation = await subscriptionService.validateAction(data.user_id, 'REGISTER_OBJECT');
      if (!(validation as any).allowed) {
        throw new Error((validation as any).reason);
      }
    }

    // Sanitize dates: convert empty strings to undefined
    if (data.date_expiration === '' as any) {
      data.date_expiration = undefined;
    }
    if (data.date_delivrance === '' as any) {
      data.date_delivrance = undefined;
    }

    // Handle validity option
    if (data.validity_option === 'PERMANENT') {
      data.date_expiration = undefined;
    } else if (data.validity_option === 'EXPIRING' && data.user_id) {
      // Check if user's plan allows expiration management
      const planCheck = await subscriptionService.validateAction(data.user_id, 'EXPIRATION_MGMT');
      if (!(planCheck as any).allowed) {
        throw new Error('Votre abonnement ne permet pas la gestion des dates d\'expiration. Passez à une offre supérieure ou choisissez l\'option "Permanent".');
      }
    }

    // Default to EXPIRING if not set
    if (!data.validity_option) {
      data.validity_option = 'EXPIRING';
    }

    // Automatically calculate fingerprint if type and number are provided
    if (data.type_doc && data.numero_doc) {
      data.fingerprint = calculateDocumentFingerprint(data.type_doc, data.numero_doc);
    }
    
    const doc = await this.documentRepository.createUserDocument(data);

    // Notify user
    if (doc.user_id) {
        await this.notificationService.notifyDocumentAdded(doc.user_id, doc.type_doc);
    }

    return await encodeMediaFields(doc);
  }

  /**
   * Get documents for a specific user
   */
  async getUserDocuments(userId: string): Promise<UserDocument[]> {
    const docs = await this.documentRepository.findUserDocuments(userId);
    return await encodeMediaFields(docs);
  }

  /**
   * Get a single document by ID
   */
  async getDocument(id: string, options: { encode?: boolean } = { encode: true }): Promise<UserDocument | null> {
    const doc = await this.documentRepository.findById(id);
    if (options.encode) {
      return await encodeMediaFields(doc);
    }
    return doc;
  }

  /**
   * Get a single document by ID (internal version often used by controllers)
   */
  async getDocumentById(id: string, options: { encode?: boolean } = { encode: true }): Promise<UserDocument | null> {
    const doc = await this.documentRepository.findById(id);
    if (options.encode) {
      return await encodeMediaFields(doc);
    }
    return doc;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string, userId: string): Promise<boolean> {
    const doc = await this.documentRepository.findById(id);
    const deleted = await this.documentRepository.deleteDocument(id, userId);
    
    if (deleted && doc) {
        await this.notificationService.notifyDocumentDeleted(userId, doc.type_doc);
    }
    
    return deleted;
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, userId: string, data: Partial<UserDocument>): Promise<UserDocument | null> {
    // Recalculate fingerprint if needed
    if (data.type_doc || data.numero_doc) {
      // Need full data to calculate fingerprint
      const existing = await this.documentRepository.findById(id);
      if (existing) {
        data.fingerprint = calculateDocumentFingerprint(
          data.type_doc || existing.type_doc, 
          data.numero_doc || existing.numero_doc
        );
      }
    }

    const doc = await this.documentRepository.updateDocument(id, userId, data);
    
    if (doc) {
      await this.notificationService.notifyDocumentUpdated(userId, doc.type_doc);
    }

    return await encodeMediaFields(doc);
  }

  /**
   * Report a document as lost
   */
  async reportDocumentLost(id: string, userId: string, password?: string): Promise<{ document: UserDocument, declarationId?: string, declarationIdentifiant?: string }> {
    // 1. Find document
    const doc = await this.documentRepository.findById(id);
    if (!doc || doc.user_id !== userId) {
      throw new Error('Document introuvable ou accès non autorisé');
    }

    // 2. Verify password if provided (for security)
    if (password) {
      const user = await this.userRepository.findById(userId);
      if (!user) throw new Error('Utilisateur introuvable');
      
      const isMatch = await argon2.verify(user.mot_de_passe, password);
      if (!isMatch) throw new Error('Mot de passe incorrect');
    }

    // 3. Create the public declaration automatically
    let declarationId: string | null = null;
    try {
      const decl = await this.declarationService.createDeclaration({
        doc_type: doc.type_doc,
        owner_name: doc.nom_sur_doc,
        document_number: doc.numero_doc,
        declaration_type: 'LOST',
        reporter_id: userId,
        photo_recto: doc.photo_recto,
        photo_verso: doc.photo_verso,
        fingerprint: doc.fingerprint,
        status: 'SEARCHING'
      }, { bypassLimits: true });
      declarationId = decl.id;
    } catch (declError) {
      console.error('⚠️ Could not auto-create declaration:', declError);
    }

    // 4. Update the document status in DB with the link
    const updatedDoc = await this.documentRepository.updateLostStatus(id, userId, true, declarationId || undefined);
    
    if (!updatedDoc) {
      throw new Error('Erreur lors de la mise à jour du document.');
    }

    // 5. Notify user
    await this.notificationService.notifyDeclarationCreated(userId, 'LOST', updatedDoc.type_doc);

    return { 
      document: await encodeMediaFields(updatedDoc),
      declarationId: declarationId || undefined,
      declarationIdentifiant: declarationId ? (await this.declarationService.getDeclarationById(declarationId))?.identifiant_doc_dm : undefined
    };
  }
}
