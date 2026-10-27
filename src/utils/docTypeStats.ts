import { getDocTypeIcon, getDocTypeImage, hasDocTypeImage, normalizeDocTypeCode } from "./docTypeVisuals";

export const STATS_PERIODS = ["day", "week", "month", "year"] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

export interface DocTypeRecentItem {
  id: string;
  type: string;
  ville?: string | null;
  date?: string | null;
}

export interface DocTypeStats {
  id: string;
  code: string;
  name: string;
  found: number;
  lost: number;
  returned: number;
  /** Évolution en % par rapport à la période précédente (peut être négative). */
  trend: number;
  recentItems: DocTypeRecentItem[];
}

export interface DocTypeCard {
  id: string;
  code: string;
  name: string;
  image: string;
  icon: string;
  hasImage: boolean;
  categorie?: string | null;
  stats: DocTypeStats;
}

export function toStatNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/[\s,_]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Les compteurs sortent de Postgres en `::int` mais le serveur n'a pas de `setTypeParser` : un
 * `numeric` rendu tel quel arrive en chaîne (« 12.5 »). Tous les compteurs passent par
 * `toStatNumber` pour cette raison — un `as number` silencieux viderait la grille sans erreur.
 */
export function parseDocTypeStats(value: unknown): DocTypeStats | null {
  const row = asRecord(value);
  if (!row) return null;

  const id = typeof row.id === "string" ? row.id : "";
  const code = normalizeDocTypeCode(typeof row.code === "string" ? row.code : "");
  const name = typeof row.name === "string" ? row.name : "";
  if (!id && !code) return null;

  const items = Array.isArray(row.recent_items) ? row.recent_items : [];
  return {
    id,
    code,
    name,
    found: toStatNumber(row.found),
    lost: toStatNumber(row.lost),
    returned: toStatNumber(row.returned),
    trend: toStatNumber(row.trend),
    recentItems: items.reduce<DocTypeRecentItem[]>((acc, item) => {
      const raw = asRecord(item);
      if (!raw) return acc;
      acc.push({
        id: typeof raw.id === "string" ? raw.id : "",
        type: typeof raw.type === "string" ? raw.type : "",
        ville: typeof raw.ville === "string" ? raw.ville : null,
        date: typeof raw.date === "string" ? raw.date : null,
      });
      return acc;
    }, []),
  };
}

export function parseDocTypeStatsList(value: unknown): DocTypeStats[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseDocTypeStats).filter((row): row is DocTypeStats => row !== null);
}

/**
 * `recent_items` mélange les mouvements de perte et de trouvaille : les écrans publics n'affichent
 * que les trouvailles.
 */
export function foundRecentItems(stats: DocTypeStats): DocTypeRecentItem[] {
  return stats.recentItems.filter((item) => item.type.toUpperCase() === "FOUND");
}

/**
 * Ville de la déclaration la plus ancienne d'un type donné. `recent_items` est trié du plus
 * récent au plus ancien : on prend donc le dernier item du type voulu.
 */
export function oldestCityOf(stats: DocTypeStats, type: "FOUND" | "LOST"): string | null {
  const items = stats.recentItems.filter((item) => item.type.toUpperCase() === type);
  const last = items[items.length - 1];
  return last?.ville || null;
}

const EMPTY_STATS: DocTypeStats = {
  id: "",
  code: "",
  name: "",
  found: 0,
  lost: 0,
  returned: 0,
  trend: 0,
  recentItems: [],
};

function statsOf(row: DocTypeStats | undefined, id: string, code: string, name: string): DocTypeStats {
  if (row) return row;
  return { ...EMPTY_STATS, id, code, name };
}

/**
 * `stats-by-type` filtre `total > 0` : un type sans déclaration de la période disparaît de la
 * réponse. On repart donc du catalogue actif et on y greffe les compteurs, pour que la grille
 * montre aussi les types à zéro plutôt que de les faire croire inexistants.
 */
export function buildDocTypeCards(
  catalogue: Array<{ id: string; nom: string; code?: string | null; categorie?: string | null }>,
  stats: DocTypeStats[]
): DocTypeCard[] {
  const byId = new Map(stats.filter((row) => row.id).map((row) => [row.id, row]));
  const byCode = new Map(stats.filter((row) => row.code).map((row) => [row.code, row]));

  const cards = catalogue.map((type) => {
    const code = normalizeDocTypeCode(type.code);
    const row = byId.get(type.id) || byCode.get(code);
    const name = row?.name || type.nom;
    return {
      id: type.id,
      code,
      name,
      image: getDocTypeImage(code),
      icon: getDocTypeIcon(code, name),
      hasImage: hasDocTypeImage(code),
      categorie: type.categorie ?? null,
      stats: statsOf(row, type.id, code, name),
    };
  });

  return cards.sort((a, b) => {
    if (b.stats.found !== a.stats.found) return b.stats.found - a.stats.found;
    return a.name.localeCompare(b.name, "fr");
  });
}

export function findDocTypeStats(stats: DocTypeStats[], code: string | undefined): DocTypeStats | null {
  const wanted = normalizeDocTypeCode(code);
  if (!wanted) return null;
  return stats.find((row) => row.code === wanted || row.id === code) || null;
}
