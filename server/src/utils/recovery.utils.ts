import { query } from '../database/db.ts';

export interface LostFoundPair {
  lostId: string;
  foundId: string | null;
  lostDecl: any;
  foundDecl: any | null;
}

/**
 * Resolve the LOST-side declaration id from either LOST or FOUND declaration id.
 */
export async function resolveLostFoundPair(docId: string): Promise<LostFoundPair | null> {
  const declRes = await query('SELECT * FROM declarations WHERE id = $1', [docId]);
  if (declRes.rows.length === 0) return null;

  const decl = declRes.rows[0];

  if (decl.declaration_type === 'LOST') {
    const matchRes = await query(
      `SELECT * FROM matches
       WHERE lost_declaration_id = $1 OR found_declaration_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [docId]
    );
    let foundDecl = null;
    let foundId: string | null = null;
    if (matchRes.rows.length > 0) {
      const match = matchRes.rows[0];
      foundId =
        match.lost_declaration_id === docId ? match.found_declaration_id : match.lost_declaration_id;
      const foundRes = await query('SELECT * FROM declarations WHERE id = $1', [foundId]);
      foundDecl = foundRes.rows[0] || null;
    }
    return { lostId: docId, foundId, lostDecl: decl, foundDecl };
  }

  const matchRes = await query(
    `SELECT * FROM matches
     WHERE lost_declaration_id = $1 OR found_declaration_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [docId]
  );
  if (matchRes.rows.length === 0) {
    return null;
  }

  const match = matchRes.rows[0];
  const lostId =
    match.lost_declaration_id === docId ? match.found_declaration_id : match.lost_declaration_id;
  const lostRes = await query('SELECT * FROM declarations WHERE id = $1', [lostId]);
  if (lostRes.rows.length === 0) return null;

  return {
    lostId,
    foundId: docId,
    lostDecl: lostRes.rows[0],
    foundDecl: decl,
  };
}

export async function assertOwnerCanPayRecovery(userId: string, docId: string): Promise<LostFoundPair> {
  const pair = await resolveLostFoundPair(docId);
  if (!pair) {
    throw new Error('Déclaration introuvable ou aucun match associé.');
  }
  if (pair.lostDecl.reporter_id !== userId) {
    throw new Error('Action non autorisée — seul le propriétaire peut payer la récupération.');
  }
  return pair;
}

/**
 * `Number(x) || fallback` silently replaces a legitimate 0 with the fallback, which
 * here would pay out fees that were never collected. Only absent/NaN values fall back
 * (note that `Number(null)` is 0, so null must be screened before the conversion).
 */
export function numOr(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export interface FinderRewardBasis {
  amount: number;
  source: 'claim' | 'docType';
}

/**
 * Fee actually collected for the recovery. Falls back to the document type tariff only
 * for claims created before payment facts were persisted on the claim.
 */
export function resolveFinderRewardBasis(claim: any, docType: any): FinderRewardBasis | null {
  const paid = claim?.amount;
  if (paid !== null && paid !== undefined && Number.isFinite(Number(paid))) {
    return { amount: Number(paid), source: 'claim' };
  }
  const tariff = docType?.prix_retrouvaille;
  if (tariff !== null && tariff !== undefined && Number.isFinite(Number(tariff))) {
    return { amount: Number(tariff), source: 'docType' };
  }
  return null;
}
