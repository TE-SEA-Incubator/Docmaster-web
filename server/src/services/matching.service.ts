import { DocumentDeclaration } from '../types/database.ts';
import { DeclarationRepository } from '../repositories/declaration.repository.ts';
import { NotificationService } from './notification.service.ts';
import { MatchRepository } from '../repositories/match.repository.ts';
import { DocumentRepository } from '../repositories/document.repository.ts';
import { deviceRepository } from '../repositories/device.repository.ts';
import { ClaimRepository } from '../repositories/claim.repository.ts';

import { DocumentTypeRepository } from '../repositories/document-type.repository.ts';

export class MatchingService {
  private declarationRepository: DeclarationRepository;
  private notificationService: NotificationService;
  private matchRepository: MatchRepository;
  private documentRepository: DocumentRepository;
  private claimRepository: ClaimRepository;
  private docTypeRepository: DocumentTypeRepository;
  private hasNewDeclarations: boolean = true; // Start true to catch up on startup

  constructor() {
    this.declarationRepository = new DeclarationRepository();
    this.notificationService = new NotificationService();
    this.matchRepository = new MatchRepository();
    this.documentRepository = new DocumentRepository();
    this.claimRepository = new ClaimRepository();
    this.docTypeRepository = new DocumentTypeRepository();
  }

  /**
   * Signal that a new declaration has been added, 
   * so the next cron job cycle should run.
   */
  public notifyNewDeclaration() {
    this.hasNewDeclarations = true;
  }

  /**
   * Main entry point to find matches for a declaration
   */
  async findAndNotifyMatches(declaration: DocumentDeclaration): Promise<void> {
    // 1. Resolve Document Type Code for normalization (if doc_type is an ID)
    let docTypeCode = declaration.doc_type;
    // Try by ID then by code
    let docTypeMeta = await this.docTypeRepository.findById(declaration.doc_type);
    if (!docTypeMeta) {
      docTypeMeta = await this.docTypeRepository.findByCode(declaration.doc_type);
    }
    
    if (docTypeMeta) {
      docTypeCode = docTypeMeta.code;
    }

    const normalizedDocType = this.normalizeDocType(docTypeCode);
    const oppositeType = declaration.declaration_type === 'LOST' ? 'FOUND' : 'LOST';
    
    // We look for candidates by the ID and the normalized code
    const candidates = await this.declarationRepository.findCandidatesForMatch(
      declaration.doc_type, 
      docTypeCode,
      oppositeType
    );

    console.log(`📊 [Matching] Comparing ${declaration.identifiant_doc_dm} (${declaration.doc_type}) with ${candidates.length} candidates...`);

    for (const candidate of candidates) {
      // Avoid matching with oneself if somehow they have the same fingerprint
      if (candidate.id === declaration.id) continue;

      // Check if we already found this match
      const lostId = declaration.declaration_type === 'LOST' ? declaration.id : candidate.id;
      const foundId = declaration.declaration_type === 'LOST' ? candidate.id : declaration.id;
      
      // Check if match already exists
      const existing = await this.matchRepository.findBetween(lostId, foundId);
      if (existing) {
        // If match exists and is high confidence, ensure statuses are MATCHED
        if (existing.score >= 80 && (declaration.status !== 'MATCHED' || candidate.status !== 'MATCHED')) {
           console.log(`      🔄 [MatchingWorker] Match exists but status not updated. Syncing...`);
           await this.handleHighConfidenceMatch(declaration, candidate);
        }
        continue;
      }

      const score = this.calculateMatchScore(declaration, candidate);

      if (score >= 80) {
        console.log(`      ✨ [HIGH CONFIDENCE MATCH] Score: ${score} between ${lostId} and ${foundId}`);
        await this.matchRepository.create(lostId, foundId, score, 'CONFIRMED');
        await this.handleHighConfidenceMatch(declaration, candidate);
      } else if (score >= 50) {
        console.log(`      🔎 [POTENTIAL MATCH] Score: ${score} between ${lostId} and ${foundId}`);
        await this.matchRepository.create(lostId, foundId, score, 'PENDING');
        try {
          // Notify the owner (lost side) about a potential match so it appears in their interface
          const ownerId = declaration.declaration_type === 'LOST' ? declaration.reporter_id : candidate.reporter_id;
          const docTypeName = await this.getDocTypeName(declaration.doc_type);
          await this.notificationService.createNotification({
            user_id: ownerId,
            type: 'MATCH_POTENTIAL',
            title: 'Correspondance potentielle trouvée',
            message: `Des correspondances potentielles ont été trouvées pour votre ${docTypeName}. Connectez-vous pour voir les détails.`,
            metadata: { lostId, foundId, score, docType: docTypeName }
          });
          console.log(`      🔔 [NOTIFY] Owner ${ownerId} notified about potential match (${score})`);
        } catch (err) {
          console.error('❌ Error notifying owner about potential match:', err);
        }
      } else {
        console.log(`      ⚪ [LOW] No action taken.`);
      }
    }

    // 2. CROSS-MATCH: If this is a FOUND item, check against Users' Private Vaults
    if (declaration.declaration_type === 'FOUND') {
      await this.checkAgainstPrivateVaults(declaration);
    }
  }

  /**
   * Check a found item against users' personal registered documents and devices
   */
  private async checkAgainstPrivateVaults(foundDecl: DocumentDeclaration) {
    console.log(`🛡️ [VaultMatch] Checking found item ${foundDecl.identifiant_doc_dm} against private vaults...`);
    
    const docTypeName = await this.getDocTypeName(foundDecl.doc_type);

    // Check Documents Vault
    if (foundDecl.fingerprint) {
        const vaultDocs = await this.documentRepository.findCandidatesByFingerprint(foundDecl.fingerprint);
        for (const doc of vaultDocs) {
            console.log(`🎯 [VaultMatch] FOUND match in private vault for user ${doc.user_id}`);
            await this.notificationService.notifyMatchFound(
                doc.user_id, 
                foundDecl.reporter_id!, 
                foundDecl.id, 
                docTypeName
            );
        }
    }

    // Check Devices Vault
    if (foundDecl.document_number) {
        const vaultDevice = await deviceRepository.findAnyByIdentifier(foundDecl.document_number);
        if (vaultDevice) {
            console.log(`🎯 [VaultMatch] FOUND match in device vault for user ${vaultDevice.user_id}`);
            await this.notificationService.notifyMatchFound(
                vaultDevice.user_id, 
                foundDecl.reporter_id!, 
                foundDecl.id, 
                docTypeName
            );
        }
    }
  }

  /**
   * Run a full cycle to find matches for all active lost declarations
   * Suitable for background jobs
   */
  async runFullMatchingCycle(): Promise<void> {
    if (!this.hasNewDeclarations) {
      return; // Skip cycle if nothing new
    }

    console.log('🔄 [MatchingWorker] Starting full matching cycle (new data detected)...');
    this.hasNewDeclarations = false;
    
    try {
      // Get all active lost declarations
      const query = "SELECT * FROM declarations WHERE declaration_type = 'LOST' AND status = 'SEARCHING'";
      // We can't use repository search directly for this specific query without filters
      // So we might want to add a method to DeclarationRepository
      
      // Get all active lost declarations
      const { rows: activeLost } = await this.declarationRepository.search({ 
        declaration_type: 'LOST', 
        status: 'SEARCHING' 
      });

      let matchCount = 0;
      for (const lost of activeLost) {
        console.log(`🔎 Checking matches for ${lost.identifiant_doc_dm} (${lost.doc_type})...`);
        await this.findAndNotifyMatches(lost);
        matchCount++;
      }
      console.log(`✅ [MatchingWorker] Finished cycle. Processed ${matchCount} lost declarations.`);
    } catch (error) {
      console.error('❌ [MatchingWorker] Error during matching cycle:', error);
    }
  }

  /**
   * Scoring Algorithm
   */
  private calculateMatchScore(d1: DocumentDeclaration, d2: DocumentDeclaration): number {
    let score = 0;

    // 1. Fingerprint / Document Number (Most important)
    if (d1.fingerprint && d2.fingerprint && d1.fingerprint === d2.fingerprint) {
      score += 100; // Perfect match
      return score; // No need to check other factors if fingerprint matches
    }

    // Partial number match (if number is long enough)
    if (d1.document_number && d2.document_number) {
        const n1 = d1.document_number.replace(/[^a-z0-9]/gi, '');
        const n2 = d2.document_number.replace(/[^a-z0-9]/gi, '');
        if (n1.length > 5 && n2.length > 5) {
            if (n1.endsWith(n2.slice(-6)) || n2.endsWith(n1.slice(-6))) {
                score += 50;
            }
        }
    }

    // 2. Owner Name Similarity
    if (d1.owner_name && d2.owner_name) {
      const similarity = this.getStringSimilarity(d1.owner_name, d2.owner_name);
      if (similarity > 0.8) score += 40;
      else if (similarity > 0.6) score += 20;
    }

    // 3. Location (City)
    if (d1.ville && d2.ville && d1.ville.toLowerCase() === d2.ville.toLowerCase()) {
      score += 20;
    }

    // 3.5 Neighborhood (Quartier)
    if (d1.quartier && d2.quartier && d1.quartier.toLowerCase() === d2.quartier.toLowerCase()) {
      score += 10;
    }

    // 4. Date proximity (loss vs found date)
    if (d1.date_perte && d2.date_perte) {
      const diff = Math.abs(new Date(d1.date_perte).getTime() - new Date(d2.date_perte).getTime());
      const daysDiff = diff / (1000 * 60 * 60 * 24);
      if (daysDiff <= 3) score += 15;
      else if (daysDiff <= 7) score += 10;
      else if (daysDiff <= 14) score += 5;
    }

    // 5. Physical condition match
    if (d1.etat_physique && d2.etat_physique && d1.etat_physique === d2.etat_physique) {
      score += 5;
    }

    // 6. Object Type (Already filtered by doc_type, but we can refine if needed)
    score += 10; 

    return Math.min(score, 100);
  }

  /**
   * Simple string similarity based on Levenshtein distance
   */
  private getStringSimilarity(s1: string, s2: string): number {
    const str1 = s1.toLowerCase();
    const str2 = s2.toLowerCase();
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    
    return (longerLength - this.levenshteinDistance(longer, shorter)) / longerLength;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  private async handleHighConfidenceMatch(d1: DocumentDeclaration, d2: DocumentDeclaration) {
    if (d1.reporter_id && d2.reporter_id) {
      const lostUserId = d1.declaration_type === 'LOST' ? d1.reporter_id : d2.reporter_id;
      const foundUserId = d1.declaration_type === 'FOUND' ? d1.reporter_id : d2.reporter_id;
      
      const lostId = d1.declaration_type === 'LOST' ? d1.id : d2.id;
      const foundId = d1.declaration_type === 'FOUND' ? d1.id : d2.id;

      // Update statuses to MATCHED when matched
      await this.declarationRepository.update(lostId, lostUserId, { status: 'MATCHED' });
      await this.declarationRepository.update(foundId, foundUserId, { status: 'MATCHED' });

      // Create automatic claim for recovery process
      const verificationCode = this.generateVerificationCode();
      await this.claimRepository.create({
        doc_id: foundId,
        owner_id: lostUserId,
        finder_id: foundUserId,
        verification_code: verificationCode,
        status: 'PENDING'
      });

      console.log(`🔐 [Claim] Auto-generated claim for document ${foundId} with code ${verificationCode}`);
      
      // Resolve human-readable doc type for notification
      const docTypeName = await this.getDocTypeName(d1.doc_type);

      await this.notificationService.notifyMatchFound(
        lostUserId, 
        foundUserId, 
        lostId, 
        docTypeName
      );
    }
  }

  /**
   * Helper to get human-readable name from ID or Code
   */
  private async getDocTypeName(docType: string): Promise<string> {
    const meta = await this.docTypeRepository.findById(docType) 
              || await this.docTypeRepository.findByCode(docType);
    return meta ? meta.nom : docType;
  }

  /**
   * Generate a 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  private normalizeDocType(type: string): string {
    const t = type.toLowerCase().trim();
    if (t.includes('passp') || t.includes('passep')) return 'passeport';
    if (t.includes('cni') || t.includes('identité')) return 'cni';
    if (t.includes('permis')) return 'permis';
    if (t.includes('acte') && t.includes('nais')) return 'acte_naissance';
    return t;
  }
}

export const matchingService = new MatchingService();
