import { ClaimRepository } from '../repositories/claim.repository.ts';
import { DeclarationRepository } from '../repositories/declaration.repository.ts';
import { MatchRepository } from '../repositories/match.repository.ts';
import { DocumentTypeRepository } from '../repositories/document-type.repository.ts';
import { DeclarationService } from './declaration.service.ts';
import { resolveLostFoundPair } from '../utils/recovery.utils.ts';
import { HttpError } from '../utils/http-error.ts';
import { TIMING } from '../config/timing.ts';

const claimRepo = new ClaimRepository();
const declRepo = new DeclarationRepository();
const matchRepo = new MatchRepository();
const docTypeRepo = new DocumentTypeRepository();

async function resolveDocType(docTypeRef: string) {
  if (!docTypeRef) return null;
  let docType = await docTypeRepo.findById(docTypeRef);
  if (!docType) {
    docType = await docTypeRepo.findByCode(docTypeRef);
  }
  return docType;
}

async function findPaidClaim(docId: string) {
  let claim = await claimRepo.findPaidByDocId(docId);
  if (claim) return claim;

  const pair = await resolveLostFoundPair(docId);
  if (pair && pair.lostId !== docId) {
    claim = await claimRepo.findPaidByDocId(pair.lostId);
    if (claim) return claim;
  }

  const matches = await matchRepo.findByDeclarationId(docId);
  for (const match of matches) {
    const lostId = match.lost_declaration_id;
    const potential = await claimRepo.findPaidByDocId(lostId);
    if (potential) return potential;
  }

  return null;
}

/**
 * Shared validation flow for POST /claims/validate and POST /declarations/:id/validate-recovery
 */
export async function validateRecoveryCode(docId: string, userId: string, code: string) {
  if (!docId || !code) {
    throw new HttpError(400, 'Document ID et code de vérification requis.');
  }

  const claim = await findPaidClaim(docId);
  if (!claim) {
    throw new HttpError(
      409,
      'Aucune réclamation payée trouvée. Le propriétaire doit d\'abord régler les frais de récupération.'
    );
  }

  // Le code de remise expire désormais comme les autres délais : la même
  // durée est servie au front par GET /settings/timing.
  const claimAgeMs = Date.now() - new Date(claim.created_at).getTime();
  if (Number.isFinite(claimAgeMs) && claimAgeMs > TIMING.claimCodeTtlHours * 60 * 60 * 1000) {
    throw new HttpError(
      410,
      `Ce code de remise a expiré (validité ${TIMING.claimCodeTtlHours} h). Demandez un nouveau code au propriétaire.`,
    );
  }

  if (claim.finder_id && claim.finder_id !== userId) {
    throw new HttpError(403, 'Seul le trouveur peut valider le code de remise.');
  }

  if (claim.attempts >= 5) {
    throw new HttpError(429, 'Trop de tentatives échouées. Contactez le support.');
  }

  if (claim.verification_code !== code) {
    const newAttempts = await claimRepo.incrementAttempts(claim.id);
    throw new HttpError(400, `Code de vérification invalide. (${Math.max(0, 5 - newAttempts)} tentative(s) restante(s))`);
  }

  const lostId = claim.doc_id;
  await claimRepo.updateStatus(claim.id, 'VALIDATED');
  await declRepo.updateStatus(lostId, 'RETURNED');

  const matches = await matchRepo.findByDeclarationId(lostId);
  if (matches?.length) {
    for (const match of matches) {
      const otherId =
        match.lost_declaration_id === lostId ? match.found_declaration_id : match.lost_declaration_id;
      await declRepo.updateStatus(otherId, 'RETURNED');
    }
  }

  const lostDecl = await declRepo.findById(lostId);
  if (lostDecl && claim.finder_id) {
    const docType = await resolveDocType(lostDecl.doc_type);
    if (docType) {
      await new DeclarationService().rewardFinderAfterValidation(claim, lostDecl, docType);
    }
  }

  return {
    success: true,
    message: 'Code validé avec succès ! Le document a été officiellement remis.',
    claimId: claim.id,
  };
}
