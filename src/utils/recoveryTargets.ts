export interface RecoveryMatchRef {
  id?: string;
  status?: string;
  lost_declaration_id?: string;
  found_declaration_id?: string;
}

const ACTIVE_STATUSES = new Set(["PENDING", "CONFIRMED", "MATCHED"]);

export function activeRecoveryMatches(
  matches: RecoveryMatchRef[] | null | undefined,
): RecoveryMatchRef[] {
  return (matches || []).filter(
    (match) =>
      ACTIVE_STATUSES.has(String(match.status || "").toUpperCase()) &&
      Boolean(match.id) &&
      Boolean(match.found_declaration_id),
  );
}

/**
 * Un document trouvé peut correspondre à plusieurs déclarations perdues, mais
 * une déclaration perdue n'a qu'un seul document trouvé actif. La liste des
 * correspondances ne sert donc qu'aux doublons historiques : avec un seul
 * candidat, on va directement à la récupération pour confirmer puis payer.
 */
export function lostRecoveryTarget(
  lostId: string,
  matches: RecoveryMatchRef[] | null | undefined,
): { href: string; multiple: boolean; hasMatch: boolean } {
  const active = activeRecoveryMatches(matches);
  if (active.length === 1) {
    const [match] = active;
    const matchId = encodeURIComponent(String(match.id));
    const foundId = encodeURIComponent(String(match.found_declaration_id));
    return {
      href: `/recuperer?id=${encodeURIComponent(lostId)}&match=${matchId}&found=${foundId}`,
      multiple: false,
      hasMatch: true,
    };
  }
  return {
    href: `/correspondances?id=${encodeURIComponent(lostId)}`,
    multiple: active.length > 1,
    hasMatch: active.length > 0,
  };
}
