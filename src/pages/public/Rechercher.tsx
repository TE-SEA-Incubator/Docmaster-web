import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import Footer from "../../layout/Footer";
import DocTypeStatCard from "../../components/public/DocTypeStatCard";
import {
  buildDocTypeCards,
  parseDocTypeStatsList,
  type DocTypeStats,
  type StatsPeriod,
} from "../../utils/docTypeStats";

interface DocType {
  id: string;
  nom: string;
  code?: string;
  icone?: string | null;
  categorie?: string | null;
}

const ENV_API_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;
const API_BASE = ENV_API_URL
  ? ENV_API_URL.replace(/\/+$/, "") + "/api/"
  : "/api/";
const CARDS_PERIOD: StatsPeriod = "month";

function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function KpiItem({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  return (
    <div className="min-w-[92px]">
      <p className="font-bricolage text-[26px] font-black leading-none tracking-tight text-textMain">
        {value}{suffix && <span className="text-[16px] font-bold text-textMuted">{suffix}</span>}
      </p>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-textMuted">{label}</p>
    </div>
  );
}

export default function Rechercher() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const typeParam = searchParams.get("type") || "";
  const [query, setQuery] = useState(queryParam);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [typeStats, setTypeStats] = useState<DocTypeStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => setQuery(queryParam), [queryParam]);

  const loadDocTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}document-types/active`, { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const payload = await res.json();
      if (payload.success && Array.isArray(payload.data)) setDocTypes(payload.data);
    } catch {
      setDocTypes([]);
    }
  }, []);

  const loadTypeStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}declarations/stats-by-type?period=${CARDS_PERIOD}`, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        setStatsError(true);
        return;
      }
      const payload = await res.json();
      setTypeStats(parseDocTypeStatsList(payload.data));
      setStatsError(false);
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocTypes();
    loadTypeStats();
  }, [loadDocTypes, loadTypeStats]);

  const typeCards = useMemo(() => buildDocTypeCards(docTypes, typeStats), [docTypes, typeStats]);
  const selectedDocType = useMemo(() => {
    if (!typeParam) return null;
    const upper = typeParam.toUpperCase();
    return docTypes.find((type) => (type.code || "").toUpperCase() === upper || type.id === typeParam) || null;
  }, [typeParam, docTypes]);
  const visibleTypeCards = useMemo(() => {
    const term = normalizeSearchTerm(queryParam);
    return typeCards.filter((card) => {
      if (selectedDocType && card.id !== selectedDocType.id) return false;
      if (!term) return true;
      return normalizeSearchTerm(card.name).includes(term) || normalizeSearchTerm(card.code || "").includes(term);
    });
  }, [typeCards, queryParam, selectedDocType]);

  const kpiTotals = useMemo(() => {
    const found = typeCards.reduce((sum, card) => sum + card.stats.found, 0);
    const returned = typeCards.reduce((sum, card) => sum + card.stats.returned, 0);
    return { found, returned, rate: found > 0 ? Math.round((returned / found) * 100) : 0 };
  }, [typeCards]);

  const handleSearch = () => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      const value = query.trim();
      if (value) next.set("q", value);
      else next.delete("q");
      return next;
    }, { replace: true });
  };

  const handleClear = () => {
    setQuery("");
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("q");
      return next;
    }, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F7F7F7" }}>
      <div className="flex-1 pb-14" style={{ paddingTop: "calc(72px + var(--promo-offset, 0px) + 24px)" }}>
        <div className="max-w-7xl mx-auto px-5 w-full">
          <div className="mb-6">
            <h1 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal">{t("rechercher_search_title")}</h1>
            <p className="text-textMuted text-sm mt-1 font-medium">{t("rechercher_search_subtitle")}</p>
          </div>

          {!statsLoading && !statsError && typeCards.length > 0 && (
            <div className="mb-6 hidden md:block bg-white border border-borderMain rounded-2xl px-5 py-4">
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                <KpiItem value={kpiTotals.found} label={t("dashboard_perf_found")} />
                <KpiItem value={kpiTotals.returned} label={t("dashboard_perf_returned")} />
                <KpiItem value={kpiTotals.rate} suffix="%" label={t("rechercher_kpi_rate")} />
                <span className="ml-auto pb-1 text-[11px] font-semibold text-textMuted">{t(`dashboard_this_${CARDS_PERIOD}`)}</span>
              </div>
            </div>
          )}

          <div className="bg-white border border-borderMain rounded-2xl md:rounded-3xl p-3 md:p-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-sm" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                  placeholder={t("rechercher_search_placeholder")}
                  aria-label={t("rechercher_types_title")}
                  className="w-full pl-11 pr-10 py-3 bg-white border border-borderMain rounded-xl outline-none text-[14px] font-medium text-textMain placeholder:text-textMuted focus:border-primary transition-colors"
                />
                {query && <button type="button" onClick={handleClear} aria-label={t("rechercher_close")} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-textMuted hover:text-textMain transition-colors"><i className="fa-solid fa-xmark text-sm" /></button>}
              </div>
              <button type="button" onClick={handleSearch} aria-label={t("rechercher_search_btn")} className="shrink-0 w-12 md:w-auto md:px-6 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-green-dark hover:bg-green-mid transition-colors">
                <i className="fa-solid fa-magnifying-glass text-xs" /><span className="hidden md:inline">{t("rechercher_search_btn")}</span>
              </button>
            </div>
          </div>

          <section className="mt-8">
            <div className="mb-4">
              <h2 className="font-bricolage text-lg md:text-xl font-bold text-textMain">{t("rechercher_types_title")}</h2>
              <p className="text-textMuted text-xs mt-0.5">{t("rechercher_types_desc")}</p>
            </div>
            {statsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="bg-white border border-borderMain rounded-2xl overflow-hidden"><div className="h-28 bg-surface2 animate-pulse" /><div className="p-4 space-y-2"><div className="h-4 w-3/4 bg-surface2 rounded animate-pulse" /><div className="h-6 w-1/2 bg-surface2 rounded animate-pulse" /><div className="h-4 w-2/3 bg-surface2 rounded animate-pulse" /></div></div>)}</div>
            ) : statsError ? (
              <p className="text-[11px] font-medium text-textMuted leading-snug">{t("rechercher_type_stats_error")}</p>
            ) : typeCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-5"><div className="w-20 h-20 rounded-2xl border border-borderMain bg-white flex items-center justify-center mb-6"><i className="fa-solid fa-folder-open text-2xl text-textMuted" /></div><h3 className="font-bricolage text-xl font-black text-textMain mb-2">{t("rechercher_types_empty")}</h3><p className="text-textMuted text-sm max-w-md leading-relaxed">{t("rechercher_types_empty_desc")}</p></div>
            ) : visibleTypeCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-5"><div className="w-16 h-16 rounded-2xl border border-borderMain bg-white flex items-center justify-center mb-4"><i className="fa-solid fa-magnifying-glass text-xl text-textMuted" /></div><h3 className="font-bricolage text-lg font-bold text-textMain">{t("rechercher_types_empty")}</h3><p className="text-textMuted text-sm mt-1">{t("rechercher_types_empty_desc")}</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleTypeCards.map((card) => <DocTypeStatCard key={card.id} card={card} periodKey={`dashboard_this_${CARDS_PERIOD}`} to={`/recherche-publique/type/${encodeURIComponent(card.code || card.id)}`} />)}
              </div>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
