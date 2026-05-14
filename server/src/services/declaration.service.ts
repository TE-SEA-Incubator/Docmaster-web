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
    // 1. Generate unique DocMaster ID (Nomenclature: DM_YYMM_N)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() is 0-indexed

    // Get count for current month to generate N
    const count = await this.declarationRepository.countByMonth(year, month);
    const n = count + 1;

    // Format: DOC_2604_1 (for LOST) or DM_2604_1 (for FOUND)
    const yy = String(year).slice(-2);
    const mm = String(month).padStart(2, "0");
    const prefix = data.declaration_type === "LOST" ? "DOC" : "DM";
    data.identifiant_doc_dm = `${prefix}_${yy}${mm}_${n}`;

    // 2. Resolve Document Type and validate
    let docType = null;
    if (data.doc_type) {
      // Try to find by ID first, then by code
      if (this.isUuid(data.doc_type)) {
        docType = await this.docTypeRepository.findById(data.doc_type);
      }
      
      if (!docType) {
        docType = await this.docTypeRepository.findByCode(data.doc_type);
      }

      if (!docType) {
        throw new Error(`Type de document invalide: ${data.doc_type}`);
      }

      // Ensure we store the ID for future-proofing and relational integrity
      data.doc_type = docType.id;
    }

    // 2.5 Check Subscription Limits
    if (data.reporter_id && !options.bypassLimits) {
      const validation = await subscriptionService.validateAction(
        data.reporter_id, 
        'CREATE_DECLARATION', 
        { docTypeId: data.doc_type }
      );

      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      // If allowed via a specific benefit (like referral free declaration), consume it
      if (validation.useBenefit && validation.subscriptionId) {
        await subscriptionService.consumeBenefit(validation.subscriptionId, 'declaration');
      }
    }

    // 3. Generate fingerprint and check for duplicates
    if (docType && data.document_number) {
      data.fingerprint = calculateDocumentFingerprint(
        docType.code, // Use the canonical code for fingerprinting
        data.document_number,
      );

      // Prevent duplicates of the SAME type (duplicate prevention)
      const existing = await this.declarationRepository.checkDuplicate(
        data.fingerprint,
        data.declaration_type!,
      );
      if (existing) {
        throw new Error(
          `Une déclaration de type ${data.declaration_type === "LOST" ? "PERTE" : "TROUVAILLE"} existe déjà pour ce numéro.`,
        );
      }
    }

    // 4. Set default status based on type
    if (data.declaration_type === "LOST") {
      data.status = "SEARCHING";
    } else {
      data.status = "AVAILABLE";
    }

    // 5. Save to DB
    const declaration = await this.declarationRepository.create(data);

    // 6. Notify user
    if (declaration.reporter_id) {
      await this.notificationService.notifyDeclarationCreated(
        declaration.reporter_id,
        declaration.declaration_type,
        docType ? docType.nom : declaration.doc_type,
      );
    }

    // 7. Check for matches using the new scoring algorithm
    matchingService
      .findAndNotifyMatches(declaration)
      .catch((err) => console.error("Error checking matches:", err));

    // 8. Award Points (based on setting)
    if (declaration.reporter_id) {
      const points = await this.settingRepository.getByKey('points_per_declaration');
      await this.awardPoints(declaration.reporter_id, Number(points) || 5);
    }

    return declaration;
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
  async searchDeclarations(filters: any): Promise<any[]> {
    const declarations = await this.declarationRepository.search(filters);
    
    // Attach doc type info to each result
    const results = await Promise.all(
      declarations.map(async (decl) => {
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
    
    return results;
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

    return results;
  }

  /**
   * Get all available declarations
   */
  async getAllDeclarations(): Promise<DocumentDeclaration[]> {
    return await this.declarationRepository.findAllAvailable();
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

    return enrichedData;
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
    }

    return declaration;
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
    const results = await this.declarationRepository.searchPublicFound(query);

    return results.map((doc) => ({
      ...doc,
      owner_name: this.maskName(doc.owner_name),
      document_number: this.maskNumber(doc.document_number),
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
  ) {
    // 1. Check declaration
    const declaration =
      await this.declarationRepository.findById(declarationId);
    if (!declaration) throw new Error("Déclaration introuvable");
    if (declaration.reporter_id !== userId)
      throw new Error("Action non autorisée");

    // 2. Create Transaction (SUCCESS mock)
    const transaction = await this.transactionRepository.create({
      user_id: userId,
      amount: amount,
      status: "SUCCESS",
      payment_method: method || "MOBILE_MONEY",
      type: "recovery_fee",
      metadata: { declarationId },
    });

    // 3. Find the associated claim to get the code
    const claim = await this.claimRepository.findByDocIdAndOwner(
      declarationId,
      userId,
    );
    if (!claim) throw new Error("Aucune réclamation active pour ce document");

    // 4. Update match/declaration status if needed
    // We could update to 'RECOVERY_PAID' or similar, but for now we keep MATCHED
    // as the UI relies on statuses to show/hide steps.

    return {
      success: true,
      transactionId: transaction.id,
      verificationCode: claim.verification_code,
    };
  }

  /**
   * Check if a string is a valid UUID
   */
  private isUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
