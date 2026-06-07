import { pool } from "../database/db.ts";
import { DeclarationRepository } from "../repositories/declaration.repository.ts";
import { DocumentDeclaration } from "../types/database.ts";
import { calculateDocumentFingerprint } from "../utils/crypto.utils.ts";
import { NotificationService } from "./notification.service.ts";
import { matchingService } from "./matching.service.ts";
import { MatchRepository } from "../repositories/match.repository.ts";
import { TransactionRepository } from "../repositories/transaction.repository.ts";
import { ClaimRepository } from "../repositories/claim.repository.ts";
import { UserRepository } from "../repositories/auth.repository.ts";
import { DocumentTypeRepository } from "../repositories/document-type.repository.ts";
import { subscriptionService } from "./subscription.service.ts";
import { SettingRepository } from "../repositories/setting.repository.ts";
import { v4 as uuidv4 } from "uuid";
import { nokashService } from "./nokash.service.ts";
import { encodeMediaFields } from "../utils/media.utils.ts";


export class DeclarationService {
  private declarationRepository: DeclarationRepository;
  private notificationService: NotificationService;
  private matchRepository: MatchRepository;
  private transactionRepository: TransactionRepository;
  private claimRepository: ClaimRepository;
  private userRepository: UserRepository;
  private docTypeRepository: DocumentTypeRepository;
  private settingRepository: SettingRepository;

  constructor() {
    this.declarationRepository = new DeclarationRepository();
    this.notificationService = new NotificationService();
    this.matchRepository = new MatchRepository();
    this.transactionRepository = new TransactionRepository();
    this.claimRepository = new ClaimRepository();
    this.userRepository = new UserRepository();
    this.docTypeRepository = new DocumentTypeRepository();
    this.settingRepository = new SettingRepository();
  }

  /**
   * Create a new declaration
   */
 async createDeclaration(
  data: Partial<DocumentDeclaration>,
  options: { bypassLimits?: boolean } = {}
): Promise<DocumentDeclaration> {
  
  console.log('📝 [DeclarationService.createDeclaration] === DÉBUT ===');
  console.log('📝 [DeclarationService.createDeclaration] Données reçues:', JSON.stringify({
    doc_type: data.doc_type,
    owner_name: data.owner_name,
    document_number: data.document_number,
    ville: data.ville,
    region: data.region,
    pays: data.pays,
    date_perte: data.date_perte,
    mode_contact: data.mode_contact,
    etat_physique: data.etat_physique,
    found_location: data.found_location,
    declaration_type: data.declaration_type,
    reporter_id: data.reporter_id
  }, null, 2));
  
  // 1. Generate unique DocMaster ID (Nomenclature: DM_YYMM_N)
  console.log('🔵 [1] Génération ID DocMaster...');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const count = await this.declarationRepository.countByMonth(year, month);
  const n = count + 1;

  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, "0");
  const prefix = data.declaration_type === "LOST" ? "DOC" : "DM";
  data.identifiant_doc_dm = `${prefix}_${yy}${mm}_${n}`;
  console.log(`🟢 [1] ID généré: ${data.identifiant_doc_dm}`);

  // 2. Resolve Document Type and validate
  console.log('🔵 [2] Résolution type de document...');
  let docType = null;
  if (data.doc_type) {
    console.log(`🔵 [2] doc_type reçu: ${data.doc_type}, isUuid: ${this.isUuid(data.doc_type)}`);
    
    if (this.isUuid(data.doc_type)) {
      console.log('🔵 [2] Recherche par ID...');
      docType = await this.docTypeRepository.findById(data.doc_type);
      console.log(`🔵 [2] Résultat findByID: ${docType ? 'TROUVÉ' : 'NON TROUVÉ'}`);
    }
    
    if (!docType) {
      console.log('🔵 [2] Recherche par code...');
      docType = await this.docTypeRepository.findByCode(data.doc_type);
      console.log(`🔵 [2] Résultat findByCode: ${docType ? 'TROUVÉ' : 'NON TROUVÉ'}`);
    }

    if (!docType) {
      console.error(`🔴 [2] Type de document invalide: ${data.doc_type}`);
      throw new Error(`Type de document invalide: ${data.doc_type}`);
    }

    console.log(`🟢 [2] Type trouvé: ${docType.nom} (ID: ${docType.id})`);
    data.doc_type = docType.id;
  } else {
    console.log('🔴 [2] Pas de doc_type fourni');
    throw new Error('doc_type est requis');
  }

  // 2.5 Check Subscription Limits
  console.log('🔵 [3] Vérification limites abonnement...');
  if (data.reporter_id && !options.bypassLimits) {
    console.log(`🔵 [3] reporter_id: ${data.reporter_id}, bypassLimits: false`);
    try {
      const validation = await subscriptionService.validateAction(
        data.reporter_id, 
        'CREATE_DECLARATION', 
        { docTypeId: data.doc_type }
      );
      console.log('🟢 [3] Résultat validation:', JSON.stringify(validation, null, 2));

      if (!(validation as any).allowed) {
        console.error(`🔴 [3] Action non autorisée: ${(validation as any).reason}`);
        throw new Error((validation as any).reason);
      }

      if ((validation as any).useBenefit && (validation as any).subscriptionId) {
        console.log('🟢 [3] Consommation bénéfice...');
        await subscriptionService.consumeBenefit((validation as any).subscriptionId, 'declaration');
      }
    } catch (error) {
      console.error('🔴 [3] Erreur validation abonnement:', error);
      throw error;
    }
  } else {
    console.log('🟡 [3] Skip validation abonnement (reporter_id manquant ou bypassLimits=true)');
  }

  // 3. Generate fingerprint and check for duplicates
  console.log('🔵 [4] Génération fingerprint et vérification doublons...');
  if (docType && data.document_number) {
    console.log(`🔵 [4] docType.code: ${docType.code}, document_number: ${data.document_number}`);
    data.fingerprint = calculateDocumentFingerprint(
      docType.code,
      data.document_number,
    );
    console.log(`🟢 [4] Fingerprint généré: ${data.fingerprint}`);

    const existing = await this.declarationRepository.checkDuplicate(
      data.fingerprint,
      data.declaration_type!,
    );
    if (existing) {
      console.error(`🔴 [4] Doublon trouvé: ${existing.id}`);
      throw new Error(
        `Une déclaration de type ${data.declaration_type === "LOST" ? "PERTE" : "TROUVAILLE"} existe déjà pour ce numéro.`,
      );
    }
    console.log('🟢 [4] Pas de doublon');
  } else {
    console.log('🟡 [4] Skip fingerprint (docType ou document_number manquant)');
  }

  // 4. Set default status based on type
  console.log('🔵 [5] Définition du statut...');
  if (data.declaration_type === "LOST") {
    data.status = "SEARCHING";
  } else {
    data.status = "AVAILABLE";
  }
  console.log(`🟢 [5] Statut défini: ${data.status}`);

  // 5. Save to DB
  console.log('🔵 [6] Sauvegarde en base de données...');
  try {
    const declaration = await this.declarationRepository.create(data);
    console.log(`🟢 [6] Déclaration créée avec ID: ${declaration.id}`);
    
    // 6. Notify user
    if (declaration.reporter_id) {
      console.log(`🔵 [7] Notification utilisateur ${declaration.reporter_id}...`);
      await this.notificationService.notifyDeclarationCreated(
        declaration.reporter_id,
        declaration.declaration_type,
        docType ? docType.nom : declaration.doc_type,
      );
      console.log('🟢 [7] Notification envoyée');
    }

    // 7. Check for matches
    console.log('🔵 [8] Vérification des matches...');
    matchingService.notifyNewDeclaration();
    matchingService
      .findAndNotifyMatches(declaration)
      .catch((err) => console.error("Error checking matches:", err));
    console.log('🟢 [8] Vérification matches lancée (async)');

    // 8. Award Points
    if (declaration.reporter_id) {
      console.log(`🔵 [9] Attribution points à ${declaration.reporter_id}...`);
      const points = await this.settingRepository.getByKey('points_per_declaration');
      await this.awardPoints(declaration.reporter_id, Number(points) || 5);
      console.log(`🟢 [9] ${points} points attribués`);
    }

    console.log('✅ [DeclarationService.createDeclaration] === FIN SUCCÈS ===');
    return await encodeMediaFields(declaration);
  } catch (error) {
    console.error('🔴 [6] Erreur sauvegarde DB:', error);
    throw error;
  }
}

  /**
   * Award points to a user
   */
  async awardPoints(userId: string, points: number) {
    try {
      await pool.query(
        'UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2',
        [points, userId]
      );
      console.log(`✅ Awarded ${points} points to user ${userId}`);
    } catch (error) {
      console.error(`❌ Error awarding points to user ${userId}:`, error);
    }
  }

  /**
   * Internal method to check for matches and notify users
   */

  /**
   * Search declarations
   */
  async searchDeclarations(filters: any): Promise<{ data: any[]; total: number }> {
    const { rows, total } = await this.declarationRepository.search(filters);
    
    // Attach doc type info to each result
    const results = await Promise.all(
      rows.map(async (decl) => {
        // Try finding doc type by ID then by code
        let docType = null;
        if (decl.doc_type && this.isUuid(decl.doc_type)) {
          docType = await this.docTypeRepository.findById(decl.doc_type);
        }
        
        if (!docType) {
          docType = await this.docTypeRepository.findByCode(decl.doc_type);
        }
        return {
          ...decl,
          docTypeInfo: docType || null
        };
      })
    );
    
    return { data: await encodeMediaFields(results), total };
  }

  /**
   * Get declarations for a user with their match status
   */
  async getUserDeclarations(userId: string): Promise<any[]> {
    const declarations =
      await this.declarationRepository.findByReporterId(userId);

    // Attach match and doc type info to each declaration
    const results = await Promise.all(
      declarations.map(async (decl) => {
        const matches = await this.matchRepository.findByDeclarationId(decl.id);
        
        // Try finding doc type by ID then by code
        let docType = null;
        if (decl.doc_type && this.isUuid(decl.doc_type)) {
          docType = await this.docTypeRepository.findById(decl.doc_type);
        }
        
        if (!docType) {
          docType = await this.docTypeRepository.findByCode(decl.doc_type);
        }

        return {
          ...decl,
          matches: matches || [],
          docTypeInfo: docType || null
        };
      }),
    );

    return await encodeMediaFields(results);
  }

  /**
   * Get all available declarations
   */
  async getAllDeclarations(): Promise<DocumentDeclaration[]> {
    const declarations = await this.declarationRepository.findAllAvailable();
    return await encodeMediaFields(declarations);
  }

  /**
   * Get a specific declaration by ID with full metadata
   */
  async getDeclarationById(id: string): Promise<any | null> {
    const declaration = await this.declarationRepository.findById(id);
    if (!declaration) return null;

    const matches = await this.matchRepository.findByDeclarationId(id);
    
    // Try finding by ID first (preferred), then fallback to code for legacy data
    let docType = null;
    if (declaration.doc_type && this.isUuid(declaration.doc_type)) {
      docType = await this.docTypeRepository.findById(declaration.doc_type);
    }
    
    if (!docType) {
      docType = await this.docTypeRepository.findByCode(declaration.doc_type);
    }
    
    const enrichedData: any = { 
      ...declaration, 
      matches: matches || [],
      docTypeInfo: docType || null
    };

    // Calculate specific gains for finder if this is a found document or matching
    if (docType) {
      enrichedData.reward_amount = (docType.prix_retrouvaille * docType.finder_percent) / 100;
      enrichedData.reward_points = docType.points_recompense;
    }

    // If matched, find the counter-party and claim status
    if (declaration.status === 'MATCHED' && matches && matches.length > 0) {
      const match = matches[0];
      const counterPartId = declaration.declaration_type === 'FOUND' 
        ? match.lost_declaration_id 
        : match.found_declaration_id;
      
      const counterPartDecl = await this.declarationRepository.findById(counterPartId);
      if (counterPartDecl) {
        const counterPartUser = await this.userRepository.findById(counterPartDecl.reporter_id);
        if (counterPartUser) {
          enrichedData.counterPart = {
            id: counterPartUser.id,
            nom: counterPartUser.nom,
            prenom: counterPartUser.prenom,
            photo_url: counterPartUser.photo_url,
            telephone: counterPartUser.telephone
          };
        }

        // Add counterpart photos (crucial for owners to see the found document)
        enrichedData.counterPartPhotoRecto = counterPartDecl.photo_recto;
        enrichedData.counterPartPhotoVerso = counterPartDecl.photo_verso;
        enrichedData.counterPartDeclaration = counterPartDecl; // Full finder declaration data

        // Add claim info (to check if owner has paid)
        // Note: doc_id in claim is always the LOST declaration ID
        const lostId = declaration.declaration_type === 'FOUND' ? match.lost_declaration_id : id;
        const ownerId = declaration.declaration_type === 'FOUND' ? counterPartDecl.reporter_id : declaration.reporter_id;
        
        const claim = await this.claimRepository.findByDocIdAndOwner(lostId, ownerId);
        enrichedData.claim = claim || null;
      }
    }

    return await encodeMediaFields(enrichedData);
  }

  /**
   * Update a declaration
   */
  async updateDeclaration(
    id: string,
    userId: string,
    data: Partial<DocumentDeclaration>,
  ): Promise<DocumentDeclaration | null> {
    const declaration = await this.declarationRepository.update(
      id,
      userId,
      data,
    );

    if (declaration) {
      await this.notificationService.notifyDeclarationUpdated(
        userId,
        declaration.doc_type,
      );

      // Trigger matching again for the updated declaration
      matchingService.notifyNewDeclaration();
      matchingService.findAndNotifyMatches(declaration).catch(err => console.error(err));
    }

    return await encodeMediaFields(declaration);
  }

  async getGlobalStats() {
    return await this.declarationRepository.getGlobalStats();
  }

  async getPerformanceStats(period: string) {
    return await this.declarationRepository.getPerformanceStats(period);
  }

  /**
   * Search for FOUND documents with public data masking
   */
  async searchPublicFound(query: string) {
    let results = [];

    if (!query || query.trim() === '') {
      // No query provided: return all AVAILABLE found declarations
      const all = await this.declarationRepository.findAllAvailable();
      results = all.filter((d) => d.declaration_type === 'FOUND');
    } else {
      results = await this.declarationRepository.searchPublicFound(query);
    }

    return results.map((doc) => ({
      id: doc.id,
      identifiant_doc_dm: doc.identifiant_doc_dm,
      doc_type: doc.doc_type,
      owner_name: doc.owner_name,
      date_trouvaille: doc.date_perte,
      date_perte: doc.date_perte,
      created_at: doc.created_at,
      ville: doc.ville,
      region: doc.region,
      pays: doc.pays,
      found_location: doc.found_location,
      status: doc.status,
      declaration_type: doc.declaration_type,
      // Public response must not expose any photo
      photo_recto: null,
      photo_verso: null,
      // Mask reporter if present
      reporter_id: "HIDDEN",
    }));
  }

  private maskName(name: string): string {
    if (!name) return "***";
    return name
      .split(" ")
      .map((p) => (p.length > 1 ? p[0] + "*".repeat(p.length - 1) : p + "*"))
      .join(" ");
  }

  private maskNumber(num: string): string {
    if (!num) return "***";
    if (num.length < 4) return "**" + "*".repeat(num.length - 2);
    return (
      num.substring(0, 2) +
      "*".repeat(num.length - 4) +
      num.substring(num.length - 2)
    );
  }

  /**
   * Initiate the recovery process by processing payment and revealing the code
   */
  async initiateRecovery(
    declarationId: string,
    userId: string,
    amount: number,
    method: string,
    phone?: string
  ) {
    // 1. Check declaration
    const declaration = await this.declarationRepository.findById(declarationId);
    if (!declaration) throw new Error("Déclaration introuvable");
    if (declaration.reporter_id !== userId) throw new Error("Action non autorisée");

    // 2. Resolve Document Type for real price
    let docType = null;
    if (declaration.doc_type && this.isUuid(declaration.doc_type)) {
      docType = await this.docTypeRepository.findById(declaration.doc_type);
    }
    const finalAmount = docType ? Number(docType.prix_retrouvaille) : (amount || 5000);

    // 3. Initiate Nokash Payment
    const orderId = `REC-${uuidv4().substring(0, 8)}`;
    const nokashRes = await nokashService.initiatePayment({
      payment_method: method === 'ORANGE_MONEY' ? 'ORANGE_MONEY' : 'MTN_MOMO',
      amount: finalAmount,
      order_id: orderId,
      user_phone: phone,
      country: 'CM'
    });

    if (nokashRes.status !== 'REQUEST_OK') {
      throw new Error(`Nokash: ${nokashRes.message || 'Erreur lors de l\'initialisation'}`);
    }

    // 4. Create PENDING Transaction
    const transaction = await this.transactionRepository.create({
      user_id: userId,
      amount: finalAmount,
      status: "PENDING",
      payment_method: method || "MOBILE_MONEY",
      type: "recovery_fee",
      external_ref: nokashRes.data.id,
      metadata: { docId: declarationId },
    });

    return {
      success: true,
      message: 'Paiement initié. Veuillez valider sur votre téléphone.',
      data: {
        nokashId: nokashRes.data.id,
        orderId
      }
    };
  }

  /**
   * Delete a declaration (hard delete)
   */
  async deleteDeclaration(declarationId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const declaration = await this.declarationRepository.findById(declarationId);
    if (!declaration) throw new Error("Déclaration introuvable");
    if (declaration.reporter_id !== userId) throw new Error("Action non autorisée");

    const deleted = await this.declarationRepository.hardDelete(declarationId, userId);
    if (!deleted) throw new Error("Déclaration introuvable");

    return { success: true, message: 'Déclaration supprimée définitivement' };
  }

  /**
   * Check if a string is a valid UUID
   */
  private isUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
