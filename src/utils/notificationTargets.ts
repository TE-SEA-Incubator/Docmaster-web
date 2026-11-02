const MATCH_TYPES = new Set([
  "MATCH_FOUND",
  "match_found",
  "MATCH_POTENTIAL",
  "match_potential",
  "MATCH_CLOSED",
  "match_closed",
]);

/**
 * Destination of a match notification.
 *
 * The finder sees all lost declarations attached to their found document in
 * /correspondances. The owner has at most one active found document, so the
 * notification opens the recovery page where the document is confirmed and
 * paid; /correspondances only remains as a fallback for legacy duplicates.
 */
export function matchRecoveryTarget(type: unknown, metadata: Record<string, any> | null | undefined): string | null {
  const normalizedType = String(type).toUpperCase();
  if (normalizedType === "PAYMENT_PENDING") {
    const paidFoundId = metadata?.foundId ?? metadata?.found_id;
    return paidFoundId ? `/rendre?id=${encodeURIComponent(String(paidFoundId))}` : null;
  }
  if (!MATCH_TYPES.has(String(type))) return null;

  if (normalizedType === "MATCH_CLOSED") return "/dashboard";

  const matchType = String(metadata?.matchType ?? "").toUpperCase();
  const lostId = metadata?.lostId ?? metadata?.docId;
  const foundId = metadata?.foundId ?? metadata?.found_id;
  const matchId = metadata?.matchId ?? metadata?.match_id;

  if (matchType === "FOUND_SIDE") {
    return foundId ? `/correspondances?id=${encodeURIComponent(String(foundId))}` : "/mes-declarations";
  }

  if (lostId && matchId && foundId) {
    const query = `id=${encodeURIComponent(String(lostId))}&match=${encodeURIComponent(String(matchId))}&found=${encodeURIComponent(String(foundId))}`;
    return `/recuperer?${query}`;
  }

  return lostId ? `/correspondances?id=${encodeURIComponent(String(lostId))}` : null;
}
