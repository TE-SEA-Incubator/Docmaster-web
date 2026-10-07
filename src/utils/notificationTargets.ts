const MATCH_FOUND_TYPES = new Set(["MATCH_FOUND", "match_found"]);

/**
 * `notifyMatchFound` ne porte que l'identifiant de la déclaration de perte, et le destine aux deux
 * acteurs : seul le propriétaire a une cible à ouvrir, le trouveur doit passer par sa propre déclaration.
 */
export function matchRecoveryTarget(type: unknown, metadata: Record<string, any> | null | undefined): string | null {
  if (!MATCH_FOUND_TYPES.has(String(type))) return null;
  if (String(metadata?.matchType ?? "").toUpperCase() !== "LOST_SIDE") return null;
  const lostDeclarationId = metadata?.docId;
  return lostDeclarationId ? `/recuperer?id=${encodeURIComponent(String(lostDeclarationId))}` : null;
}
