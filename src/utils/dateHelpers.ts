/**
 * Date helpers shared across the docmaster app.
 */

/**
 * Le jour courant en YYYY-MM-DD, calculé sur le calendrier local. `toISOString()`
 * tronqué donne le jour UTC, donc la veille après 23 h en UTC+1.
 */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Add a number of months to an ISO date string (YYYY-MM-DD), clamped to the
 * last day of the target month when the source day doesn't fit (e.g. 31 Jan +
 * 1 month → 28/29 Feb).
 *
 * @param dateStr Source date in YYYY-MM-DD format
 * @param months  Number of months to add
 * @returns        New date in YYYY-MM-DD, or "" if the input is empty
 */
export function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().split("T")[0];
}

/**
 * Convert an ISO date string (YYYY-MM-DD) to a localized short string
 * (DD/MM/YYYY). Returns "" for falsy input.
 */
export function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

/**
 * Format a declaration date into relative time text, e.g.:
 * "Retrouvé à l'instant", "Retrouvé il y a 2 h", "Retrouvé il y a 3 jours",
 * "Retrouvé il y a 2 semaines", "Retrouvé il y a 1 mois", "Retrouvé il y a 2 ans".
 */
export function formatRetrouveTimeAgo(dateString?: string | null, lang: string = "fr"): string {
  if (!dateString) {
    if (lang === "en") return "Found recently";
    if (lang === "ar") return "عُثر عليه مؤخراً";
    return "Retrouvé récemment";
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    if (lang === "en") return "Found recently";
    if (lang === "ar") return "عُثر عليه مؤخراً";
    return "Retrouvé récemment";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    if (lang === "en") return "Found just now";
    if (lang === "ar") return "عُثر عليه للتو";
    return "Retrouvé à l'instant";
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    if (diffMin <= 1) {
      if (lang === "en") return "Found just now";
      if (lang === "ar") return "عُثر عليه للتو";
      return "Retrouvé à l'instant";
    }
    if (lang === "en") return `Found ${diffMin} min ago`;
    if (lang === "ar") return `عُثر عليه منذ ${diffMin} دقيقة`;
    return `Retrouvé il y a ${diffMin} min`;
  }

  if (diffHours < 24) {
    if (lang === "en") return `Found ${diffHours}h ago`;
    if (lang === "ar") return `عُثر عليه منذ ${diffHours} ساعة`;
    return `Retrouvé il y a ${diffHours} h`;
  }

  if (diffDays === 1) {
    if (lang === "en") return "Found 1 day ago";
    if (lang === "ar") return "عُثر عليه منذ يوم";
    return "Retrouvé il y a 1 jour";
  }

  if (diffDays < 7) {
    if (lang === "en") return `Found ${diffDays} days ago`;
    if (lang === "ar") return `عُثر عليه منذ ${diffDays} أيام`;
    return `Retrouvé il y a ${diffDays} jours`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) {
    if (lang === "en") return diffWeeks === 1 ? "Found 1 week ago" : `Found ${diffWeeks} weeks ago`;
    if (lang === "ar") return diffWeeks === 1 ? "عُثر عليه منذ أسبوع" : `عُثر عليه منذ ${diffWeeks} أسابيع`;
    return diffWeeks === 1 ? "Retrouvé il y a 1 semaine" : `Retrouvé il y a ${diffWeeks} semaines`;
  }

  const diffMonths = Math.max(1, Math.floor(diffDays / 30.4375));
  if (diffMonths < 12) {
    if (lang === "en") return diffMonths === 1 ? "Found 1 month ago" : `Found ${diffMonths} months ago`;
    if (lang === "ar") return diffMonths === 1 ? "عُثر عليه منذ شهر" : `عُثر عليه منذ ${diffMonths} أشهر`;
    return diffMonths === 1 ? "Retrouvé il y a 1 mois" : `Retrouvé il y a ${diffMonths} mois`;
  }

  const diffYears = Math.max(1, Math.floor(diffDays / 365.25));
  if (lang === "en") return diffYears === 1 ? "Found 1 year ago" : `Found ${diffYears} years ago`;
  if (lang === "ar") return diffYears === 1 ? "عُثر عليه منذ سنة" : `عُثر عليه منذ ${diffYears} سنوات`;
  return diffYears === 1 ? "Retrouvé il y a 1 an" : `Retrouvé il y a ${diffYears} ans`;
}

