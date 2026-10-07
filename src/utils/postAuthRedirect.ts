import type { Location } from "react-router-dom";

/**
 * Où l'on renvoie un visiteur qui vient de s'identifier.
 * ProtectedRoute mémorise la page visée dans l'état de la navigation, les liens de transfert
 * passent par ?redirect. Sans ce retour, la graine de déclaration sur laquelle le visiteur a
 * cliqué (« c'est mon document ») meurt à la connexion.
 * Seuls les chemins internes sont acceptés : « //hote » partirait hors du site.
 */
export function postAuthRedirect(
  location: Location,
  searchParams: URLSearchParams,
  fallback = "/dashboard"
): string {
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const attempted = `${from?.pathname ?? ""}${from?.search ?? ""}`;
  return internal(searchParams.get("redirect")) || internal(attempted) || fallback;
}

function internal(value?: string | null): string {
  return value && /^\/(?!\/)/.test(value) ? value : "";
}
