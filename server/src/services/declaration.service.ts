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
import { startNokashPaymentPolling, activateRecovery } from "../controllers/payment.controller.ts";
import { encodeMediaFields } from "../utils/media.utils.ts";
import { HttpError } from "../utils/http-error.ts";
import { numOr, resolveFinderRewardBasis } from "../utils/recovery.utils.ts";
import { cacheTtl, getOrSet } from "../cache/cache.ts";
import {
  buildPublicSearchCacheKey,
  normalizePublicSearchQuery,
  normalizeStatsPeriod,
} from "../cache/keys.ts";


/**
 * A loss/discovery date cannot be in the future. "Today" stays allowed
 * (end of day), the past is untouched.
 */
function assertNotFutureDate(value: unknown): void {
  if (value === null || value === undefined || value === '') return;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (date.getTime() > endOfToday.getTime()) {
    throw new HttpError(400, 'La date de perte ou de découverte ne peut pas être dans le futur.');
  }
}

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
  if (data.reporter_id && data.client_request_id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.client_request_id)) {
      throw new HttpError(400, 'Clé de requête invalide.');
    }
    const existing = await this.declarationRepository.findByClientRequestId(
      data.reporter_id,
      data.client_request_id,
    );
    if (existing) return existing;
  }

  assertNotFutureDate(data.date_perte);

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
      throw new HttpError(400, `Type de document invalide: ${data.doc_type}`);
    }

    console.log(`🟢 [2] Type trouvé: ${docType.nom} (ID: ${docType.id})`);
    data.doc_type = docType.id;
  } else {
    console.log('🔴 [2] Pas de doc_type fourni');
    throw new HttpError(400, 'doc_type est requis');
  }

  // 2.5 Check Subscription Limits
  console.log('🔵 [3] Vérification limites abonnement...');
  if (data.reporter_id && !options.bypassLimits && data.declaration_type === 'LOST') {
    console.log(`🔵 [3] reporter_id: ${data.reporter_id}, bypassLimits: false`);
    try {
      const validation = await subscriptionService.validateAction(
        data.reporter_id, 
        'CREATE_DECLARATION', 
        { docTypeId: data.doc_type, docTypeCode: docType?.code || data.doc_type }
      );
      console.log('🟢 [3] Résultat validation:', JSON.stringify(validation, null, 2));

      if (!(validation as any).allowed) {
        console.error(`🔴 [3] Action non autorisée: ${(validation as any).reason}`);
        throw new HttpError(403, (validation as any).reason);
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
      throw new HttpError(
        409,
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
    const wasCreated = (declaration as DocumentDeclaration & { __was_created?: boolean }).__was_created !== false;
    delete (declaration as DocumentDeclaration & { __was_created?: boolean }).__was_created;
    // A simultaneous retry can race the initial lookup; the unique index makes this
    // upsert return the first declaration and prevents repeating notifications/rewards.
    if (!wasCreated) return declaration;
    console.log(`🟢 [6] Déclaration créée avec ID: ${declaration.id}`);
    
    // 6. Notify user (only for user reporters; partners have their own portal)
    if (declaration.reporter_id && declaration.reporter_type !== 'PARTENAIRE') {
      console.log(`🔵 [7] Notification utilisateur ${declaration.reporter_id}...`);
      await this.notificationService.notifyDeclarationCreated(
        declaration.reporter_id,
        declaration.declaration_type,
        docType ? docType.nom : declaration.doc_type,
      );
      console.log('🟢 [7] Notification envoyée');
    } else if (declaration.reporter_type === 'PARTENAIRE' && declaration.reporter_id) {
      console.log(`🟡 [7] Notifier partenaire ${declaration.reporter_id} de la déclaration créée`);
      await this.notificationService.notifyPartenaireDeclarationCreated(
        declaration.reporter_id,
        docType ? docType.nom : declaration.doc_type,
      );
    }

    // 6.5 Notify authorities of the zone (each authority only receives its zone's declarations)
    try {
      await this.notificationService.notifyAutoritesZone({
        ...declaration,
        doc_type_name: docType ? docType.nom : declaration.doc_type,
      });
    } catch (err) {
      console.error('Error notifying autorites of zone:', err);
    }

    // 7. Check for matches
    console.log('🔵 [8] Vérification des matches...');
    matchingService.notifyNewDeclaration();
    matchingService
      .findAndNotifyMatches(declaration)
      .catch((err) => {
        console.error('Error checking matches:', err);
        matchingService.notifyNewDeclaration();
      });
    console.log('🟢 [8] Vérification matches lancée (async)');

    // 8. Award Points (users + partenaires — partenaires ont leur propre colonne points)
    if (declaration.reporter_id) {
      const points = await this.settingRepository.getByKey('points_per_declaration');
      const pts = Number(points) || 5;

      if (declaration.reporter_type === 'PARTENAIRE') {
        console.log(`🔵 [9] Attribution points partenaire à ${declaration.reporter_id}...`);
        await this.awardPartnerPoints(declaration.reporter_id, pts);
        const { PartenaireEarningsService } = await import('./partenaire-earnings.service.ts');
        await new PartenaireEarningsService().recordDeclarationPoints(declaration.reporter_id, pts, {
          declarationId: declaration.id,
          docType: declaration.doc_type,
        });
        console.log(`🟢 [9] ${pts} points partenaire attribués`);
      } else {
        console.log(`🔵 [9] Attribution points à ${declaration.reporter_id}...`);
        await this.awardPoints(declaration.reporter_id, pts);

        const { EarningsService } = await import('./earnings.service.ts');
        await new EarningsService().recordDeclarationPoints(declaration.reporter_id, pts, {
          declarationId: declaration.id,
          docType: declaration.doc_type,
        });

        console.log(`🟢 [9] ${points} points attribués`);
      }
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

  async awardPartnerPoints(partenaireId: string, points: number) {
    try {
      await pool.query(
        'UPDATE partenaires SET points = COALESCE(points, 0) + $1, updated_at = NOW() WHERE id = $2',
        [points, partenaireId]
      );
      console.log(`✅ Awarded ${points} points to partner ${partenaireId}`);
    } catch (error) {
      console.error(`❌ Error awarding points to partner ${partenaireId}:`, error);
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
    const isAdminView = !!filters.include_all;

    // Attach partner organisation name for PARTENAIRE reporters
    const partnerMap: Record<string, string> = {};
    const partnerIds = [
      ...new Set(
        rows
          .filter((d) => d.reporter_type === 'PARTENAIRE' && d.reporter_id)
          .map((d) => d.reporter_id)
      ),
    ];
    if (partnerIds.length > 0) {
      try {
        const pRes = await pool.query(
          'SELECT id, nom_organisation FROM partenaires WHERE id = ANY($1::uuid[])',
          [partnerIds]
        );
        pRes.rows.forEach((p) => { partnerMap[p.id] = p.nom_organisation; });
      } catch (err) {
        console.error('Error resolving partner org names:', err);
      }
    }

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
        return isAdminView
          ? {
              ...decl,
              docTypeInfo: docType || null,
              reporter_partenaire_nom:
                decl.reporter_type === 'PARTENAIRE' ? partnerMap[decl.reporter_id] || null : null,
            }
          : this.maskDeclarationForPublic({
              ...decl,
              docTypeInfo: docType || null,
              reporter_partenaire_nom:
                decl.reporter_type === 'PARTENAIRE' ? partnerMap[decl.reporter_id] || null : null,
            });
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
  async getDeclarationById(
    id: string,
    options?: { preferredMatchFoundId?: string },
  ): Promise<any | null> {
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

    // Attach partner organisation name for PARTENAIRE reporters
    if (declaration.reporter_type === 'PARTENAIRE' && declaration.reporter_id) {
      try {
        const pRes = await pool.query(
          'SELECT nom_organisation FROM partenaires WHERE id = $1',
          [declaration.reporter_id]
        );
        enrichedData.reporter_partenaire_nom = pRes.rows[0]?.nom_organisation || null;
      } catch (err) {
        console.error('Error resolving partner org name:', err);
      }
    }

    // Calculate specific gains & recovery cost if docType is resolved
    if (docType) {
      enrichedData.prix_retrouvaille = Number(docType.prix_retrouvaille);
      enrichedData.prix_recuperation = Number(docType.prix_retrouvaille);
      enrichedData.recovery_cost = Number(docType.prix_retrouvaille);
      enrichedData.reward_amount = (Number(docType.prix_retrouvaille) * Number(docType.finder_percent)) / 100;
      enrichedData.reward_points = docType.points_recompense;
    }

    // If matched or has an active potential match, attach counter-party details
    const activeStatuses = ['PENDING', 'CONFIRMED', 'MATCHED'];
    let match = null as (typeof matches)[number] | null;
    if (matches && matches.length > 0) {
      if (options?.preferredMatchFoundId) {
        match = matches.find(
          (m) =>
            activeStatuses.includes(m.status) &&
            (m.found_declaration_id === options.preferredMatchFoundId ||
              m.lost_declaration_id === options.preferredMatchFoundId),
        ) ?? null;
      }
      if (!match && declaration.status === 'MATCHED') {
        match = matches.find((m) => activeStatuses.includes(m.status)) ?? matches[0] ?? null;
      }
      if (!match && declaration.declaration_type === 'LOST') {
        match = matches.find((m) => activeStatuses.includes(m.status)) ?? null;
      }
    }

    if (match) {
      const counterPartId = declaration.declaration_type === 'FOUND' 
        ? match.lost_declaration_id 
        : match.found_declaration_id;
      
      const counterPartDecl = await this.declarationRepository.findById(counterPartId);
      if (counterPartDecl) {
        const isPartner = counterPartDecl.reporter_type === 'PARTENAIRE';
        const counterPartUser = isPartner
          ? null
          : await this.userRepository.findById(counterPartDecl.reporter_id);

        if (isPartner && counterPartDecl.reporter_id) {
          let orgNom: string | null = null;
          try {
            const pRes = await pool.query(
              'SELECT nom_organisation FROM partenaires WHERE id = $1',
              [counterPartDecl.reporter_id]
            );
            orgNom = pRes.rows[0]?.nom_organisation || null;
          } catch (err) {
            console.error('Error resolving partner org name:', err);
          }
          enrichedData.counterPart = {
            id: counterPartDecl.reporter_id,
            nom: orgNom || 'Organisation partenaire',
            prenom: '',
            is_partenaire: true,
          };
          if (declaration.declaration_type === 'LOST') {
            enrichedData.finder_name = orgNom || 'Organisation partenaire';
          }
        }

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

        // Nom du trouveur (pour une déclaration PERDUE) / du propriétaire (pour une TROUVÉE)
        if (declaration.declaration_type === 'LOST' && counterPartUser) {
          enrichedData.finder_name = `${counterPartUser.prenom} ${counterPartUser.nom}`.trim();
        }

        // Add claim info (to check if owner has paid)
        // Note: doc_id in claim is always the LOST declaration ID
        const lostId = declaration.declaration_type === 'FOUND' ? match.lost_declaration_id : id;
        const ownerId = declaration.declaration_type === 'FOUND' ? counterPartDecl.reporter_id : declaration.reporter_id;
        
        const claim = await this.claimRepository.findByDocIdAndOwner(lostId, ownerId);
        enrichedData.claim = claim || null;

        // Afficher la récompense qui sera réellement versée (fraction de l'encaissement),
        // pas le tarif actuel du type de document.
        if (claim && claim.amount !== null && claim.amount !== undefined) {
          enrichedData.reward_amount = (Number(claim.amount) * numOr(docType?.finder_percent, 80)) / 100;
        }
      }
    }

    return await encodeMediaFields(enrichedData);
  }

  /**
   * Whether a user may open the recovery render context (owner, finder, or lost owner via match).
   */
  async userCanAccessRenderContext(userId: string, declaration: any): Promise<boolean> {
    const matches = declaration.matches || [];
    for (const m of matches) {
      if (!['PENDING', 'CONFIRMED', 'MATCHED'].includes(m.status)) continue;

      const lostId = m.lost_declaration_id;
      const foundId = m.found_declaration_id;

      if (declaration.declaration_type === 'LOST' && declaration.id === lostId && declaration.reporter_id === userId) {
        return true;
      }
      if (declaration.declaration_type === 'FOUND' && declaration.id === foundId && declaration.reporter_id === userId) {
        return true;
      }

      const lostDecl =
        declaration.declaration_type === 'LOST' && declaration.id === lostId
          ? declaration
          : await this.declarationRepository.findById(lostId);
      if (lostDecl?.reporter_id === userId) return true;

      const foundDecl =
        declaration.declaration_type === 'FOUND' && declaration.id === foundId
          ? declaration
          : await this.declarationRepository.findById(foundId);
      if (foundDecl?.reporter_id === userId) return true;
    }
    return false;
  }

  /**
   * Update a declaration
   */
  async updateDeclaration(
    id: string,
    userId: string,
    data: Partial<DocumentDeclaration>,
  ): Promise<DocumentDeclaration | null> {
    assertNotFutureDate(data.date_perte);

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
      matchingService
      .findAndNotifyMatches(declaration)
      .catch((err) => {
        console.error('Matching error:', err);
        matchingService.notifyNewDeclaration();
      });
    }

    return await encodeMediaFields(declaration);
  }

  async getGlobalStats() {
    return getOrSet(
      "pub:stats:global",
      cacheTtl.stats,
      () => this.declarationRepository.getGlobalStats(),
    );
  }

  async getPerformanceStats(period?: string) {
    const normalizedPeriod = normalizeStatsPeriod(period);
    return getOrSet(
      `pub:stats:performance:${normalizedPeriod}`,
      cacheTtl.statsPeriod,
      () => this.declarationRepository.getPerformanceStats(normalizedPeriod),
    );
  }

  async getStatsByType(period?: string) {
    const normalizedPeriod = normalizeStatsPeriod(period);
    return getOrSet(
      `pub:stats:by-type:${normalizedPeriod}`,
      cacheTtl.statsPeriod,
      () => this.declarationRepository.getStatsByType(normalizedPeriod),
    );
  }

  /**
   * Search for FOUND documents with public data masking
   */
  async searchPublicFound(query: string, docTypeKey = "") {
    const normalizedQuery = normalizePublicSearchQuery(query);
    const normalizedType = (docTypeKey || "").trim();
    const cacheKey = await buildPublicSearchCacheKey(normalizedQuery, normalizedType);

    return getOrSet(cacheKey, cacheTtl.search, () =>
      this.loadPublicFound(normalizedQuery, normalizedType),
    );
  }

  private async loadPublicFound(query: string, docTypeKey = "") {
    const results = query
      ? await this.declarationRepository.searchPublicFound(query, docTypeKey)
      : await this.declarationRepository.findPublicFound(undefined, docTypeKey);

    return Promise.all(results.map((doc) => this.mapPublicFound(doc)));
  }

  /**
   * Derniers documents trouvés publics d'un type, tous statuts sauf CANCELLED.
   * La page détail d'un type affiche aussi les documents appariés ou retournés
   * (les compteurs publics les incluent déjà) : `search-public` ne couvrant que
   * les AVAILABLE, une section « récents » limitée à cet endpoint reste vide.
   */
  async publicRecentByType(type: string, limit = 8) {
    const normalized = (type || "").trim();
    if (!normalized) return [];
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 20) : 8;
    return getOrSet(
      `pub:recent:type:${normalized.toLowerCase()}:${safeLimit}`,
      cacheTtl.search,
      async () => {
        const results = await this.declarationRepository.findPublicFoundByDocType(
          normalized,
          safeLimit,
        );
        return Promise.all(results.map((doc) => this.mapPublicFound(doc)));
      },
    );
  }

  /** Masquage commun aux écrans publics : nom partiel, photo encodée, contact invisible. */
  private async mapPublicFound(doc: any) {
    const media = await encodeMediaFields({ photo_recto: doc.photo_recto });
    const docTypeInfo =
      doc.docTypeInfo && typeof doc.docTypeInfo === "object"
        ? {
            nom: typeof doc.docTypeInfo.nom === "string" ? doc.docTypeInfo.nom : null,
            code: typeof doc.docTypeInfo.code === "string" ? doc.docTypeInfo.code : null,
          }
        : null;
    return {
      id: doc.id,
      identifiant_doc_dm: doc.identifiant_doc_dm,
      doc_type: doc.doc_type,
      doc_type_id: doc.doc_type_id ?? null,
      docTypeInfo,
      owner_name: this.maskName(doc.owner_name),
      date_trouvaille: doc.date_perte,
      date_perte: doc.date_perte,
      created_at: doc.created_at,
      ville: doc.ville,
      region: doc.region,
      pays: doc.pays,
      found_location: doc.found_location,
      status: doc.status,
      declaration_type: doc.declaration_type,
      photo_recto: media.photo_recto || null,
      photo_verso: null,
      has_photo: Boolean(media.photo_recto),
      reporter_id: "HIDDEN",
    };
  }

  private maskDeclarationForPublic(decl: any) {
    const { metadata, ...rest } = decl;
    return {
      ...rest,
      owner_name: this.maskName(decl.owner_name),
      document_number: this.maskNumber(decl.document_number),
      date_naissance: null,
      telephone_contact: decl.telephone_contact ? this.maskNumber(decl.telephone_contact) : null,
      email_contact: decl.email_contact ? this.maskEmail(decl.email_contact) : null,
      photo_recto: null,
      photo_verso: null,
      reporter_id: 'HIDDEN',
      metadata: null,
    };
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length <= 2 ? `${local[0] || ''}***` : `${local[0]}***${local.slice(-1)}`;
    return `${maskedLocal}@${domain}`;
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
    const { assertOwnerCanPayRecovery } = await import('../utils/recovery.utils.ts');
    const pair = await assertOwnerCanPayRecovery(userId, declarationId);
    const lostId = pair.lostId;
    const declaration = pair.lostDecl;

    if (declaration.payment_status === 'PAID') {
      throw new HttpError(409, 'Les frais de récupération ont déjà été payés pour ce document.');
    }

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
      metadata: { docId: lostId },
    });

    startNokashPaymentPolling({
      externalRef: nokashRes.data.id,
      onSuccess: async (transaction) => {
        const metadata = typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata;
        await activateRecovery(transaction.user_id, metadata.docId, transaction.id);
      }
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
    if (!declaration) throw new HttpError(404, "Déclaration introuvable");
    if (declaration.reporter_id !== userId) throw new HttpError(403, "Action non autorisée");

    const deleted = await this.declarationRepository.hardDelete(declarationId, userId);
    if (!deleted) throw new HttpError(404, "Déclaration introuvable");

    return { success: true, message: 'Déclaration supprimée définitivement' };
  }

  /**
   * Reward the finder after a successful claim validation.
   * Partner finders are credited on the partner wallet (partenaires.wallet_balance
   * + partenaire_wallet_transactions), user finders on the user wallet + points.
   */
  async rewardFinderAfterValidation(claim: any, lostDecl: any, docType: any): Promise<number | null> {
    if (!lostDecl || !claim.finder_id || !docType) return null;

    const basis = resolveFinderRewardBasis(claim, docType);
    if (!basis) {
      console.warn(`[Reward] No payment basis for claim ${claim.id} — skipping finder payout`);
      return null;
    }
    const finderPercent = numOr(docType.finder_percent, 80);
    const pointsReward = numOr(docType.points_recompense, 20);
    const rewardAmount = (basis.amount * finderPercent) / 100;
    if (basis.source === 'docType') {
      console.warn(`[Reward] claim ${claim.id} has no persisted payment fact, payout derived from tariff`);
    }

    // Detect if the finder is a partner (standalone account, own wallet)
    const finderIsPartner = (await pool.query(
      `SELECT id FROM partenaires WHERE id = $1`,
      [claim.finder_id]
    )).rows.length > 0;

    const { walletService } = await import('./wallet.service.ts');
    if (finderIsPartner) {
      if (rewardAmount > 0) {
        await walletService.creditPartner(claim.finder_id, rewardAmount, 'DECLARATION_REWARD', {
          referenceId: claim.id,
          referenceType: 'claim',
          metadata: { docId: lostDecl.id }
        });
        // Record transaction (payout) for the partner
        await pool.query(
          `INSERT INTO transactions (id, user_id, amount, currency, status, payment_method, type, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            claim.finder_id,
            rewardAmount,
            'XAF',
            'SUCCESS',
            'VIRTUAL_WALLET',
            'finder_payout',
            JSON.stringify({
              docId: lostDecl.id,
              claimId: claim.id,
              note: `Récompense pour remise de ${docType.nom}`,
              partenaire: true,
            }),
          ]
        );
        // Notifier le partenaire de la rémunération
        await this.notificationService.notifyPartenaireReward(
          claim.finder_id,
          rewardAmount,
          docType.nom,
          lostDecl.id
        );
      }
      await this.awardPartnerPoints(claim.finder_id, pointsReward);
      const { PartenaireEarningsService } = await import('./partenaire-earnings.service.ts');
      await new PartenaireEarningsService().recordReturnPoints(claim.finder_id, pointsReward, rewardAmount, {
        docId: lostDecl.id,
        claimId: claim.id,
        docType: docType.nom,
      });
      console.log(`🟢 [Reward] Finder est un partenaire — récompense ${rewardAmount} XAF + ${pointsReward} pts créditées`);
    } else {
      await this.awardPoints(claim.finder_id, pointsReward);

      if (rewardAmount > 0) {
        await walletService.credit(claim.finder_id, rewardAmount, 'DECLARATION_REWARD', {
          referenceId: claim.id,
          referenceType: 'claim',
          metadata: { docId: lostDecl.id }
        });

        // Record Transaction
        await this.transactionRepository.create({
          user_id: claim.finder_id,
          amount: rewardAmount,
          currency: 'XAF',
          status: 'SUCCESS',
          payment_method: 'VIRTUAL_WALLET',
          type: 'finder_payout',
          metadata: { docId: lostDecl.id, claimId: claim.id }
        });
      }

      // Record Earnings & Send Notifications
      const { EarningsService } = await import('./earnings.service.ts');
      await new EarningsService().recordReturnPoints(
        claim.finder_id,
        pointsReward,
        rewardAmount,
        { docId: lostDecl.id, claimId: claim.id, docType: docType.nom }
      );
      console.log(`💰 [Reward] Finder ${claim.finder_id} rewarded with ${rewardAmount} XAF and ${pointsReward} pts after validation.`);
    }

    // Notify Owner
    await this.notificationService.notifyDocumentRecovered(claim.owner_id, docType.nom, lostDecl.id);

    return rewardAmount;
  }

  /**
   * Validate recovery code and process all rewards/status updates
   */
  async validateRecovery(declarationId: string, userId: string, code: string) {
    const { validateRecoveryCode } = await import('./recovery-validation.service.ts');
    return validateRecoveryCode(declarationId, userId, code);
  }

  /**
   * Check if a string is a valid UUID
   */
  private isUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
