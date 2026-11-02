import { getClient, query } from '../database/db.ts';
import { HttpError } from './http-error.ts';

export interface LostFoundPair {
  lostId: string;
  foundId: string | null;
  lostDecl: any;
  foundDecl: any | null;
  matchId?: string | null;
  match?: any | null;
  ambiguous?: boolean;
}

export const RECOVERY_RESERVATION_TTL_MINUTES = Math.max(
  1,
  Number(process.env.RECOVERY_RESERVATION_TTL_MINUTES) || 15,
);

const ACTIVE_MATCH_STATUSES = `('PENDING', 'CONFIRMED')`;
const FINAL_FOUND_STATUSES = `('RETURNED', 'CLAIMED', 'CANCELLED', 'RESERVED')`;

async function loadMatchPair(matchId: string, docId?: string): Promise<LostFoundPair | null> {
  const matchRes = await query('SELECT * FROM matches WHERE id = $1', [matchId]);
  const match = matchRes.rows[0];
  if (!match) return null;

  if (docId && match.lost_declaration_id !== docId && match.found_declaration_id !== docId) {
    return null;
  }

  const lostRes = await query('SELECT * FROM declarations WHERE id = $1', [
    match.lost_declaration_id,
  ]);
  const foundRes = await query('SELECT * FROM declarations WHERE id = $1', [
    match.found_declaration_id,
  ]);
  if (!lostRes.rows[0] || !foundRes.rows[0]) return null;

  return {
    lostId: match.lost_declaration_id,
    foundId: match.found_declaration_id,
    lostDecl: lostRes.rows[0],
    foundDecl: foundRes.rows[0],
    matchId: match.id,
    match,
  };
}

/**
 * Resolve a LOST/FOUND pair.
 *
 * When `matchId` is provided, the pair is exact. Without it, only CONFIRMED
 * matches are considered; a PENDING match is never selected implicitly for a
 * recovery payment.
 */
export async function resolveLostFoundPair(
  docId: string,
  matchId?: string | null,
): Promise<LostFoundPair | null> {
  if (matchId) {
    return loadMatchPair(matchId, docId);
  }

  const declRes = await query('SELECT * FROM declarations WHERE id = $1', [docId]);
  const decl = declRes.rows[0];
  if (!decl) return null;

  const matchRes = await query(
    `SELECT * FROM matches
     WHERE (lost_declaration_id = $1 OR found_declaration_id = $1)
       AND status IN ${ACTIVE_MATCH_STATUSES}
     ORDER BY CASE status WHEN 'CONFIRMED' THEN 0 ELSE 1 END,
              score DESC,
              created_at DESC`,
    [docId],
  );

  const matches = matchRes.rows;
  if (matches.length === 0) {
    return {
      lostId: decl.declaration_type === 'LOST' ? decl.id : '',
      foundId: decl.declaration_type === 'FOUND' ? decl.id : null,
      lostDecl: decl.declaration_type === 'LOST' ? decl : null,
      foundDecl: decl.declaration_type === 'FOUND' ? decl : null,
      matchId: null,
      match: null,
      ambiguous: false,
    };
  }

  const match = matches[0];
  const lostId =
    match.lost_declaration_id === docId ? match.found_declaration_id : match.lost_declaration_id;

  if (decl.declaration_type === 'LOST') {
    const foundRes = await query('SELECT * FROM declarations WHERE id = $1', [
      match.found_declaration_id,
    ]);
    return {
      lostId: decl.id,
      foundId: match.found_declaration_id,
      lostDecl: decl,
      foundDecl: foundRes.rows[0] || null,
      matchId: match.id,
      match,
      ambiguous: matches.length > 1,
    };
  }

  const lostRes = await query('SELECT * FROM declarations WHERE id = $1', [lostId]);
  if (!lostRes.rows[0]) return null;
  return {
    lostId,
    foundId: decl.id,
    lostDecl: lostRes.rows[0],
    foundDecl: decl,
    matchId: match.id,
    match,
    ambiguous: matches.length > 1,
  };
}

export async function assertOwnerCanPayRecovery(
  userId: string,
  docId: string,
  matchId?: string | null,
): Promise<LostFoundPair> {
  const pair = await resolveLostFoundPair(docId, matchId);
  if (!pair || !pair.lostDecl || !pair.foundDecl || !pair.matchId) {
    throw new HttpError(404, 'Déclaration introuvable ou aucune correspondance active.');
  }
  if (pair.lostDecl.reporter_id !== userId) {
    throw new HttpError(403, 'Action non autorisée — seul le propriétaire peut payer la récupération.');
  }
  if (pair.ambiguous && !matchId) {
    throw new HttpError(409, 'Plusieurs correspondances existent. Choisissez le document à récupérer.');
  }

  const match = pair.match;
  if (!match || match.status !== 'CONFIRMED') {
    throw new HttpError(409, 'Cette correspondance doit être confirmée avant le paiement.');
  }
  if (!match.owner_confirmed_at) {
    throw new HttpError(409, 'Confirmez cette correspondance avant de lancer le paiement.');
  }
  if (FINAL_FOUND_STATUSES.includes(String(pair.foundDecl.status))) {
    throw new HttpError(409, 'Ce document a déjà été traité ou est en cours de traitement.');
  }
  if (['RESERVED', 'CLAIMED', 'RETURNED', 'CANCELLED'].includes(String(pair.lostDecl.status))) {
    throw new HttpError(409, 'Cette déclaration est déjà en cours de traitement ou clôturée.');
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

export interface RecoveryReservation {
  id: string;
  match_id: string | null;
  lost_declaration_id: string;
  found_declaration_id: string;
  owner_id: string | null;
  transaction_id: string | null;
  status: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export async function restoreStatuses(
  client: { query: (text: string, params?: any[]) => Promise<any> },
  lostId: string,
  foundId: string | null,
) {
  const lostActive = await client.query(
    `SELECT 1 FROM matches WHERE lost_declaration_id = $1 AND status IN ${ACTIVE_MATCH_STATUSES} LIMIT 1`,
    [lostId],
  );
  await client.query('UPDATE declarations SET status = $2 WHERE id = $1', [
    lostId,
    lostActive.rows.length > 0 ? 'MATCHED' : 'SEARCHING',
  ]);

  if (foundId) {
    const foundActive = await client.query(
      `SELECT 1 FROM matches WHERE found_declaration_id = $1 AND status IN ${ACTIVE_MATCH_STATUSES} LIMIT 1`,
      [foundId],
    );
    await client.query('UPDATE declarations SET status = $2 WHERE id = $1', [
      foundId,
      foundActive.rows.length > 0 ? 'MATCHED' : 'AVAILABLE',
    ]);
  }
}

/**
 * Atomically reserve a FOUND document for one owner. The unique partial indexes
 * on recovery_reservations guarantee that only one payment flow can own it.
 */
export async function acquireRecoveryReservation(
  pair: LostFoundPair,
  ownerId: string,
  transactionId: string | null = null,
): Promise<RecoveryReservation> {
  if (!pair.foundId || !pair.matchId) {
    throw new HttpError(409, 'Aucune correspondance active pour ce document.');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [pair.foundId]);

    const matchRes = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [
      pair.matchId,
    ]);
    const match = matchRes.rows[0];
    if (!match || match.status !== 'CONFIRMED' || !match.owner_confirmed_at) {
      throw new HttpError(409, 'Cette correspondance doit être confirmée avant le paiement.');
    }

    const lostRes = await client.query('SELECT * FROM declarations WHERE id = $1 FOR UPDATE', [
      pair.lostId,
    ]);
    const foundRes = await client.query('SELECT * FROM declarations WHERE id = $1 FOR UPDATE', [
      pair.foundId,
    ]);
    const lost = lostRes.rows[0];
    const found = foundRes.rows[0];
    if (!lost || !found) throw new HttpError(404, 'Déclaration introuvable.');
    if (lost.reporter_id !== ownerId) throw new HttpError(403, 'Action non autorisée.');
    if (FINAL_FOUND_STATUSES.includes(String(found.status))) {
      throw new HttpError(409, 'Ce document a déjà été traité ou est en cours de traitement.');
    }

    const activeClaim = await client.query(
      `SELECT id FROM claims
       WHERE (found_declaration_id = $1 OR doc_id = $2)
         AND status IN ('PAID', 'VALIDATED')
       LIMIT 1`,
      [pair.foundId, pair.lostId],
    );
    if (activeClaim.rows.length > 0) {
      throw new HttpError(409, 'Ce document a déjà été traité.');
    }

    const existing = await client.query(
      `SELECT id, expires_at FROM recovery_reservations
       WHERE (found_declaration_id = $1 OR lost_declaration_id = $2)
         AND status IN ('RESERVED', 'PAID')
       LIMIT 1`,
      [pair.foundId, pair.lostId],
    );
    if (existing.rows.length > 0) {
      throw new HttpError(409, 'Ce document est déjà en cours de traitement par un autre propriétaire.');
    }

    await client.query(
      `UPDATE declarations SET status = 'RESERVED' WHERE id = ANY($1::uuid[])`,
      [[pair.lostId, pair.foundId]],
    );

    const reservationRes = await client.query(
      `INSERT INTO recovery_reservations
         (match_id, lost_declaration_id, found_declaration_id, owner_id, transaction_id, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'RESERVED', NOW() + ($6 || ' minutes')::interval)
       RETURNING *`,
      [
        pair.matchId,
        pair.lostId,
        pair.foundId,
        ownerId,
        transactionId,
        String(RECOVERY_RESERVATION_TTL_MINUTES),
      ],
    );

    await client.query('COMMIT');
    return reservationRes.rows[0];
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    if (error?.code === '23505') {
      throw new HttpError(409, 'Ce document est déjà en cours de traitement.');
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function attachTransactionToReservation(
  reservationId: string,
  transactionId: string,
): Promise<void> {
  await query(
    'UPDATE recovery_reservations SET transaction_id = $2, updated_at = NOW() WHERE id = $1',
    [reservationId, transactionId],
  );
}

export async function markReservationPaid(
  reservationId: string,
  transactionId: string | null,
): Promise<void> {
  await query(
    `UPDATE recovery_reservations
     SET status = 'PAID', transaction_id = COALESCE($2, transaction_id), updated_at = NOW()
     WHERE id = $1 AND status IN ('RESERVED', 'PAID')`,
    [reservationId, transactionId],
  );
}

export async function completeReservationForFound(foundId: string): Promise<void> {
  await query(
    `UPDATE recovery_reservations
     SET status = 'COMPLETED', updated_at = NOW()
     WHERE found_declaration_id = $1 AND status IN ('RESERVED', 'PAID')`,
    [foundId],
  );
}

export async function releaseRecoveryReservation(
  reservationId: string,
  status: 'EXPIRED' | 'CANCELLED' = 'CANCELLED',
): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const reservationRes = await client.query(
      'SELECT * FROM recovery_reservations WHERE id = $1 FOR UPDATE',
      [reservationId],
    );
    const reservation = reservationRes.rows[0];
    if (!reservation || !['RESERVED', 'PAID'].includes(String(reservation.status))) {
      await client.query('COMMIT');
      return;
    }
    await client.query(
      'UPDATE recovery_reservations SET status = $2, updated_at = NOW() WHERE id = $1',
      [reservationId, status],
    );
    await restoreStatuses(client, reservation.lost_declaration_id, reservation.found_declaration_id);
    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function releaseReservationByTransaction(transactionId: string): Promise<void> {
  const { rows } = await query(
    `SELECT id FROM recovery_reservations
     WHERE transaction_id = $1 AND status = 'RESERVED'
     LIMIT 1`,
    [transactionId],
  );
  if (rows[0]) await releaseRecoveryReservation(rows[0].id, 'CANCELLED');
}

export async function expireRecoveryReservations(): Promise<number> {
  const { rows } = await query(
    `SELECT id FROM recovery_reservations
     WHERE status = 'RESERVED' AND expires_at < NOW()
     ORDER BY expires_at ASC
     LIMIT 50`,
  );
  let released = 0;
  for (const row of rows) {
    try {
      await releaseRecoveryReservation(row.id, 'EXPIRED');
      released += 1;
    } catch (error) {
      console.error('[RecoveryReservation] Failed to expire reservation', row.id, error);
    }
  }
  return released;
}
