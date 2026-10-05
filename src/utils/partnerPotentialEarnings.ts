import type { PartenaireDeclaration } from "../services/partenairesService";
import type { DocTypeCatalog } from "../types/api";

export function computePartnerPotentialEarnings(
  declarations: PartenaireDeclaration[],
  docTypes: DocTypeCatalog[]
) {
  const typeMap = new Map(docTypes.map((t) => [t.id, t]));
  const eligible = declarations.filter((d) => d.status === "AVAILABLE" || d.status === "MATCHED");
  let total = 0;
  let totalPts = 0;
  for (const decl of eligible) {
    const type = decl.doc_type ? typeMap.get(decl.doc_type) : undefined;
    const prix = Number(type?.prix_retrouvaille ?? 0);
    const pct = Number(type?.finder_percent ?? 80);
    total += (prix * pct) / 100;
    totalPts += Number(type?.points_recompense ?? 0);
  }
  return { total, totalPts, count: eligible.length };
}

export function computeDeclarationReward(
  declaration: PartenaireDeclaration | null | undefined,
  docTypes: DocTypeCatalog[],
  renderContext?: Record<string, any> | null
) {
  const fromContext = Number(renderContext?.reward_amount ?? 0);
  if (fromContext > 0) return fromContext;

  if (!declaration?.doc_type) return 0;
  const type = docTypes.find((t) => t.id === declaration.doc_type);
  if (!type) return 0;
  const prix = Number(type.prix_retrouvaille ?? 0);
  const pct = Number(type.finder_percent ?? 80);
  return (prix * pct) / 100;
}

export function computeDeclarationPointsReward(
  declaration: PartenaireDeclaration | null | undefined,
  docTypes: DocTypeCatalog[]
) {
  if (!declaration?.doc_type) return 0;
  const type = docTypes.find((t) => t.id === declaration.doc_type);
  return Number(type?.points_recompense ?? 0);
}
