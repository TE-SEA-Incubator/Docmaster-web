import { ClaimRepository } from '../repositories/claim.repository.ts';
import { DeclarationRepository } from '../repositories/declaration.repository.ts';
import { DocumentTypeRepository } from '../repositories/document-type.repository.ts';
import { DeclarationService } from './declaration.service.ts';
import { resolveLostFoundPair, completeReservationForFound } from '../utils/recovery.utils.ts';
import { HttpError } from '../utils/http-error.ts';
import { TIMING } from '../config/timing.ts';
import { query } from '../database/db.ts';

const claimRepo = new ClaimRepository();
const declRepo = new DeclarationRepository();
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
  const declaration = await declRepo.findById(docId);
  if (!declaration) return null;

  if (declaration.declaration_type === 'FOUND') {
    return await claimRepo.findPaidByFoundId(docId);
  }

  const direct = await claimRepo.findPaidByDocId(docId);
  if (direct) return direct;

  // Legacy rows may use a FOUND id as doc_id.
  const byFound = await claimRepo.findPaidByFoundId(docId);
  if (byFound) return byFound;

  const pair = await resolveLostFoundPair(docId);
  if (pair?.lostId && pair.lostId !== docId) {
    return await claimRepo.findPaidByDocId(pair.lostId);
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
  // durée est servie au front par GET /settings/timing. Un code régénéré par
  // le support porte sa propre échéance (claims.code_expires_at).
  const expiresAtMs = claim.code_expires_at
    ? new Date(claim.code_expires_at).getTime()
    : new Date(claim.created_at).getTime() + TIMING.claimCodeTtlHours * 60 * 60 * 1000;
  if (Number.isFinite(expiresAtMs) && Date.now() > expiresAtMs) {
    throw new HttpError(
      410,
      `Ce code de remise a expiré (validité ${TIMING.claimCodeTtlHours} h). Demandez un nouveau code au propriétaire ou au support.`,
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
  const foundId = claim.found_declaration_id
    || (await resolveLostFoundPair(lostId))?.foundId
    || null;

  const validated = await query(
    `UPDATE claims SET status = 'VALIDATED'
     WHERE id = $1 AND status = 'PAID'
     RETURNING *`,
    [claim.id],
  );
  if (validated.rows.length === 0) {
    throw new HttpError(409, 'Cette réclamation a déjà été validée.');
  }

  await declRepo.updateStatus(lostId, 'RETURNED');
  if (foundId) {
    await declRepo.updateStatus(foundId, 'RETURNED');
    await completeReservationForFound(foundId);
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
    foundId,
  };
}
