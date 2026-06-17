import { DocumentDeclaration } from '../types/database.ts';
import { DeclarationRepository } from '../repositories/declaration.repository.ts';
import { NotificationService } from './notification.service.ts';
import { MatchRepository } from '../repositories/match.repository.ts';
import { DocumentRepository } from '../repositories/document.repository.ts';
import { deviceRepository } from '../repositories/device.repository.ts';
import { ClaimRepository } from '../repositories/claim.repository.ts';
import { DocumentTypeRepository } from '../repositories/document-type.repository.ts';
import { SocketService } from './socket.service.ts';

export interface MatchCriterion {
  name: string;
  points: number;
  max: number;
  matched: boolean;
  icon: string;
  detail?: string;
}

export interface MatchResult {
  lostId: string;
  foundId: string;
  totalScore: number;
  criteria: MatchCriterion[];
  status: string;
}

export class MatchingService {
  private declarationRepository: DeclarationRepository;
  private notificationService: NotificationService;
  private matchRepository: MatchRepository;
  private documentRepository: DocumentRepository;
  private claimRepository: ClaimRepository;
  private docTypeRepository: DocumentTypeRepository;
  private socketService: SocketService;
  private hasNewDeclarations: boolean = true;

  constructor() {
    this.declarationRepository = new DeclarationRepository();
    this.notificationService = new NotificationService();
    this.matchRepository = new MatchRepository();
    this.documentRepository = new DocumentRepository();
    this.claimRepository = new ClaimRepository();
    this.docTypeRepository = new DocumentTypeRepository();
    this.socketService = SocketService.getInstance();
  }

  public notifyNewDeclaration() {
    this.hasNewDeclarations = true;
  }

  async findAndNotifyMatches(declaration: DocumentDeclaration): Promise<void> {
    let docTypeCode = declaration.doc_type;
    let docTypeMeta = await this.docTypeRepository.findById(declaration.doc_type);
    if (!docTypeMeta) {
      docTypeMeta = await this.docTypeRepository.findByCode(declaration.doc_type);
    }

    if (docTypeMeta) {
      docTypeCode = docTypeMeta.code;
    }

    const normalizedDocType = this.normalizeDocType(docTypeCode);
    const oppositeType = declaration.declaration_type === 'LOST' ? 'FOUND' : 'LOST';

    const candidates = await this.declarationRepository.findCandidatesForMatch(
      declaration.doc_type,
      docTypeCode,
      oppositeType
    );

    console.log(`📊 [Matching] Comparing ${declaration.identifiant_doc_dm} (${declaration.doc_type}) with ${candidates.length} candidates...`);

    for (const candidate of candidates) {
      if (candidate.id === declaration.id) continue;

      const lostId = declaration.declaration_type === 'LOST' ? declaration.id : candidate.id;
      const foundId = declaration.declaration_type === 'LOST' ? candidate.id : declaration.id;

      const existing = await this.matchRepository.findBetween(lostId, foundId);
      if (existing) {
        if (existing.score >= 80 && (declaration.status !== 'MATCHED' || candidate.status !== 'MATCHED')) {
           console.log(`      🔄 [MatchingWorker] Match exists but status not updated. Syncing...`);
           await this.handleHighConfidenceMatch(declaration, candidate);
        }
        continue;
      }

      const matchResult = this.calculateMatchScore(declaration, candidate, lostId, foundId);
      const score = matchResult.totalScore;

      // Toujours émettre l'événement de tentative de matching pour le monitoring
      this.socketService.sendToAdmins('MATCHING:ATTEMPT', {
        ...matchResult,
        lostDeclaration: {
          id: declaration.declaration_type === 'LOST' ? declaration.id : candidate.id,
          identifiant_doc_dm: declaration.declaration_type === 'LOST' ? declaration.identifiant_doc_dm : candidate.identifiant_doc_dm,
          owner_name: declaration.declaration_type === 'LOST' ? declaration.owner_name : candidate.owner_name,
          doc_type: declaration.declaration_type === 'LOST' ? declaration.doc_type : candidate.doc_type,
          ville: declaration.declaration_type === 'LOST' ? declaration.ville : candidate.ville,
          quartier: declaration.declaration_type === 'LOST' ? declaration.quartier : candidate.quartier,
        },
        foundDeclaration: {
          id: declaration.declaration_type === 'FOUND' ? declaration.id : candidate.id,
          identifiant_doc_dm: declaration.declaration_type === 'FOUND' ? declaration.identifiant_doc_dm : candidate.identifiant_doc_dm,
          owner_name: declaration.declaration_type === 'FOUND' ? declaration.owner_name : candidate.owner_name,
          doc_type: declaration.declaration_type === 'FOUND' ? declaration.doc_type : candidate.doc_type,
          ville: declaration.declaration_type === 'FOUND' ? declaration.ville : candidate.ville,
          quartier: declaration.declaration_type === 'FOUND' ? declaration.quartier : candidate.quartier,
        },
        timestamp: new Date().toISOString(),
      });

      if (score >= 80) {
        console.log(`      ✨ [HIGH CONFIDENCE MATCH] Score: ${score} between ${lostId} and ${foundId}`);
        const match = await this.matchRepository.create(lostId, foundId, score, 'CONFIRMED', { criteria: matchResult.criteria });
        await this.handleHighConfidenceMatch(declaration, candidate);
        // Note: L'événement 'MATCHING:MATCH_FOUND' est conservé en plus de 'MATCHING:ATTEMPT' pour compatibilité
        this.socketService.sendToAdmins('MATCHING:MATCH_FOUND', {
          ...matchResult,
          id: match?.id,
          lostDeclaration: {
            id: declaration.declaration_type === 'LOST' ? declaration.id : candidate.id,
            identifiant_doc_dm: declaration.declaration_type === 'LOST' ? declaration.identifiant_doc_dm : candidate.identifiant_doc_dm,
            owner_name: declaration.declaration_type === 'LOST' ? declaration.owner_name : candidate.owner_name,
            doc_type: declaration.declaration_type === 'LOST' ? declaration.doc_type : candidate.doc_type,
            ville: declaration.declaration_type === 'LOST' ? declaration.ville : candidate.ville,
            quartier: declaration.declaration_type === 'LOST' ? declaration.quartier : candidate.quartier,
          },
          foundDeclaration: {
            id: declaration.declaration_type === 'FOUND' ? declaration.id : candidate.id,
            identifiant_doc_dm: declaration.declaration_type === 'FOUND' ? declaration.identifiant_doc_dm : candidate.identifiant_doc_dm,
            owner_name: declaration.declaration_type === 'FOUND' ? declaration.owner_name : candidate.owner_name,
            doc_type: declaration.declaration_type === 'FOUND' ? declaration.doc_type : candidate.doc_type,
            ville: declaration.declaration_type === 'FOUND' ? declaration.ville : candidate.ville,
            quartier: declaration.declaration_type === 'FOUND' ? declaration.quartier : candidate.quartier,
          },
          timestamp: new Date().toISOString(),
        });
      } else if (score >= 50) {
        console.log(`      🔎 [POTENTIAL MATCH] Score: ${score} between ${lostId} and ${foundId}`);
        const match = await this.matchRepository.create(lostId, foundId, score, 'PENDING', { criteria: matchResult.criteria });
        try {
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
        this.socketService.sendToAdmins('MATCHING:MATCH_FOUND', {
          ...matchResult,
          id: match?.id,
          lostDeclaration: {
            id: declaration.declaration_type === 'LOST' ? declaration.id : candidate.id,
            identifiant_doc_dm: declaration.declaration_type === 'LOST' ? declaration.identifiant_doc_dm : candidate.identifiant_doc_dm,
            owner_name: declaration.declaration_type === 'LOST' ? declaration.owner_name : candidate.owner_name,
            doc_type: declaration.declaration_type === 'LOST' ? declaration.doc_type : candidate.doc_type,
            ville: declaration.declaration_type === 'LOST' ? declaration.ville : candidate.ville,
            quartier: declaration.declaration_type === 'LOST' ? declaration.quartier : candidate.quartier,
          },
          foundDeclaration: {
            id: declaration.declaration_type === 'FOUND' ? declaration.id : candidate.id,
            identifiant_doc_dm: declaration.declaration_type === 'FOUND' ? declaration.identifiant_doc_dm : candidate.identifiant_doc_dm,
            owner_name: declaration.declaration_type === 'FOUND' ? declaration.owner_name : candidate.owner_name,
            doc_type: declaration.declaration_type === 'FOUND' ? declaration.doc_type : candidate.doc_type,
            ville: declaration.declaration_type === 'FOUND' ? declaration.ville : candidate.ville,
            quartier: declaration.declaration_type === 'FOUND' ? declaration.quartier : candidate.quartier,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(`      ⚪ [LOW] No action taken.`);
      }
    }

    if (declaration.declaration_type === 'FOUND') {
      await this.checkAgainstPrivateVaults(declaration);
    }
  }

  private async checkAgainstPrivateVaults(foundDecl: DocumentDeclaration) {
    console.log(`🛡️ [VaultMatch] Checking found item ${foundDecl.identifiant_doc_dm} against private vaults...`);

    const docTypeName = await this.getDocTypeName(foundDecl.doc_type);

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

  async runFullMatchingCycle(): Promise<void> {
    if (!this.hasNewDeclarations) {
      return;
    }

    console.log('🔄 [MatchingWorker] Starting full matching cycle (new data detected)...');
    this.hasNewDeclarations = false;

    const cycleId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const cycleStart = Date.now();

    this.socketService.sendToAdmins('MATCHING:CYCLE_START', {
      cycleId,
      timestamp: new Date().toISOString(),
    });

    try {
      const { rows: activeLost } = await this.declarationRepository.search({
        declaration_type: 'LOST',
        status: 'SEARCHING'
      });

      const total = activeLost.length;
      let processed = 0;
      let highConfidence = 0;
      let potential = 0;

      for (const lost of activeLost) {
        processed++;
        console.log(`🔎 Checking matches for ${lost.identifiant_doc_dm} (${lost.doc_type})...`);

        this.socketService.sendToAdmins('MATCHING:CHECKING', {
          declarationId: lost.id,
          identifiant: lost.identifiant_doc_dm,
          docType: lost.doc_type,
          ownerName: lost.owner_name,
          ville: lost.ville,
          progress: { current: processed, total },
          timestamp: new Date().toISOString(),
        });

        await this.findAndNotifyMatches(lost);
      }

      const summary = { highConfidence, potential };

      console.log(`✅ [MatchingWorker] Finished cycle. Processed ${processed} lost declarations.`);

      this.socketService.sendToAdmins('MATCHING:CYCLE_END', {
        cycleId,
        processed,
        highConfidence,
        potential,
        totalMatches: highConfidence + potential,
        durationMs: Date.now() - cycleStart,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ [MatchingWorker] Error during matching cycle:', error);
      this.socketService.sendToAdmins('MATCHING:CYCLE_ERROR', {
        cycleId,
        error: String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  private calculateMatchScore(d1: DocumentDeclaration, d2: DocumentDeclaration, lostId: string, foundId: string): MatchResult {
    const criteria: MatchCriterion[] = [];
    let totalScore = 0;

    if (d1.fingerprint && d2.fingerprint && d1.fingerprint === d2.fingerprint) {
      criteria.push({ name: 'Empreinte numérique', points: 100, max: 100, matched: true, icon: '✓', detail: 'Identique' });
      totalScore += 100;
      return { lostId, foundId, totalScore: 100, criteria, status: 'CONFIRMED' };
    } else if (d1.fingerprint && d2.fingerprint) {
      criteria.push({ name: 'Empreinte numérique', points: 0, max: 100, matched: false, icon: '✗' });
    } else {
      criteria.push({ name: 'Empreinte numérique', points: 0, max: 100, matched: false, icon: '—', detail: 'Non disponible' });
    }

    if (d1.document_number && d2.document_number) {
      const n1 = d1.document_number.replace(/[^a-z0-9]/gi, '');
      const n2 = d2.document_number.replace(/[^a-z0-9]/gi, '');
      if (n1.length > 5 && n2.length > 5) {
        if (n1.endsWith(n2.slice(-6)) || n2.endsWith(n1.slice(-6))) {
          criteria.push({ name: 'N° document (6 derniers)', points: 50, max: 50, matched: true, icon: '✓', detail: 'Correspondance sur les 6 derniers caractères' });
          totalScore += 50;
        } else {
          criteria.push({ name: 'N° document (6 derniers)', points: 0, max: 50, matched: false, icon: '✗' });
        }
      } else {
        criteria.push({ name: 'N° document (6 derniers)', points: 0, max: 50, matched: false, icon: '—', detail: 'Numéro trop court' });
      }
    } else {
      criteria.push({ name: 'N° document (6 derniers)', points: 0, max: 50, matched: false, icon: '—', detail: 'Non disponible' });
    }

    if (d1.owner_name && d2.owner_name) {
      const similarity = this.getStringSimilarity(d1.owner_name, d2.owner_name);
      const percent = Math.round(similarity * 100);
      if (similarity > 0.8) {
        criteria.push({ name: 'Similitude nom', points: 40, max: 40, matched: true, icon: '✓', detail: `${percent}%` });
        totalScore += 40;
      } else if (similarity > 0.6) {
        criteria.push({ name: 'Similitude nom', points: 20, max: 40, matched: true, icon: '⚠', detail: `${percent}%` });
        totalScore += 20;
      } else {
        criteria.push({ name: 'Similitude nom', points: 0, max: 40, matched: false, icon: '✗', detail: `${percent}%` });
      }
    } else {
      criteria.push({ name: 'Similitude nom', points: 0, max: 40, matched: false, icon: '—', detail: 'Non disponible' });
    }

    if (d1.ville && d2.ville && d1.ville.toLowerCase() === d2.ville.toLowerCase()) {
      criteria.push({ name: 'Ville', points: 20, max: 20, matched: true, icon: '✓', detail: d1.ville });
      totalScore += 20;
    } else if (d1.ville && d2.ville) {
      criteria.push({ name: 'Ville', points: 0, max: 20, matched: false, icon: '✗', detail: `${d1.ville} ≠ ${d2.ville}` });
    } else {
      criteria.push({ name: 'Ville', points: 0, max: 20, matched: false, icon: '—', detail: 'Non disponible' });
    }

    if (d1.quartier && d2.quartier && d1.quartier.toLowerCase() === d2.quartier.toLowerCase()) {
      criteria.push({ name: 'Quartier', points: 10, max: 10, matched: true, icon: '✓', detail: d1.quartier });
      totalScore += 10;
    } else if (d1.quartier && d2.quartier) {
      criteria.push({ name: 'Quartier', points: 0, max: 10, matched: false, icon: '✗', detail: `${d1.quartier} ≠ ${d2.quartier}` });
    } else {
      criteria.push({ name: 'Quartier', points: 0, max: 10, matched: false, icon: '—', detail: 'Non disponible' });
    }

    if (d1.date_perte && d2.date_perte) {
      const diff = Math.abs(new Date(d1.date_perte).getTime() - new Date(d2.date_perte).getTime());
      const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24));
      if (daysDiff <= 3) {
        criteria.push({ name: 'Proximité date', points: 15, max: 15, matched: true, icon: '✓', detail: `${daysDiff} jour(s)` });
        totalScore += 15;
      } else if (daysDiff <= 7) {
        criteria.push({ name: 'Proximité date', points: 10, max: 15, matched: true, icon: '⚠', detail: `${daysDiff} jour(s)` });
        totalScore += 10;
      } else if (daysDiff <= 14) {
        criteria.push({ name: 'Proximité date', points: 5, max: 15, matched: true, icon: '⚠', detail: `${daysDiff} jour(s)` });
        totalScore += 5;
      } else {
        criteria.push({ name: 'Proximité date', points: 0, max: 15, matched: false, icon: '✗', detail: `${daysDiff} jour(s)` });
      }
    } else {
      criteria.push({ name: 'Proximité date', points: 0, max: 15, matched: false, icon: '—', detail: 'Non disponible' });
    }

    if (d1.etat_physique && d2.etat_physique && d1.etat_physique === d2.etat_physique) {
      criteria.push({ name: 'État physique', points: 5, max: 5, matched: true, icon: '✓', detail: d1.etat_physique });
      totalScore += 5;
    } else if (d1.etat_physique && d2.etat_physique) {
      criteria.push({ name: 'État physique', points: 0, max: 5, matched: false, icon: '✗', detail: `${d1.etat_physique} ≠ ${d2.etat_physique}` });
    } else {
      criteria.push({ name: 'État physique', points: 0, max: 5, matched: false, icon: '—', detail: 'Non disponible' });
    }

    criteria.push({ name: 'Type de document', points: 10, max: 10, matched: true, icon: '✓' });
    totalScore += 10;

    totalScore = Math.min(totalScore, 100);

    const status = totalScore >= 80 ? 'CONFIRMED' : totalScore >= 50 ? 'PENDING' : 'LOW';
    return { lostId, foundId, totalScore, criteria, status };
  }

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

      await this.declarationRepository.update(lostId, lostUserId, { status: 'MATCHED' });
      await this.declarationRepository.update(foundId, foundUserId, { status: 'MATCHED' });

      const verificationCode = this.generateVerificationCode();
      await this.claimRepository.create({
        doc_id: foundId,
        owner_id: lostUserId,
        finder_id: foundUserId,
        verification_code: verificationCode,
        status: 'PENDING'
      });

      console.log(`🔐 [Claim] Auto-generated claim for document ${foundId} with code ${verificationCode}`);

      const docTypeName = await this.getDocTypeName(d1.doc_type);

      await this.notificationService.notifyMatchFound(
        lostUserId,
        foundUserId,
        lostId,
        docTypeName
      );
    }
  }

  private async getDocTypeName(docType: string): Promise<string> {
    const meta = await this.docTypeRepository.findById(docType)
              || await this.docTypeRepository.findByCode(docType);
    return meta ? meta.nom : docType;
  }

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
