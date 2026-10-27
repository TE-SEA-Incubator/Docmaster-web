import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useAuth } from "../../context/AuthContext";
import Footer from "../../layout/Footer";
import PublicDocumentCard, {
  isIdLike,
  resolvePublicImageUrl,
} from "../../components/public/PublicDocumentCard";
import PublicDocumentDetailModal, {
  type PublicDocumentDetailData,
} from "../../components/ui/PublicDocumentDetailModal";
import { formatRetrouveTimeAgo } from "../../utils/dateHelpers";
import { normalizeDocTypeCode } from "../../utils/docTypeVisuals";
import {
  STATS_PERIODS,
  buildDocTypeCards,
  foundRecentItems,
  parseDocTypeStatsList,
  type DocTypeCard,
  type DocTypeStats,
  type StatsPeriod,
} from "../../utils/docTypeStats";

interface CatalogueType {
  id: string;
  nom: string;
  code?: string | null;
}

/** Sous-ensemble des champs renvoyés par `declarations/search-public`. */
interface PublicDoc {
  id: string | number;
  doc_type?: string;
  document_type?: string;
  type_doc?: string;
  docTypeInfo?: { nom: string; code?: string };
  document_type_id?: string;
  doc_type_id?: string;
  owner_name?: string;
  nom_sur_doc?: string;
  nom_complet?: string;
  document_owner?: string;
  identifiant_doc_dm?: string;
  numero_doc?: string;
  document_number?: string;
  numero_document?: string;
  photo_recto?: string;
  photo?: string;
  image_url?: string;
  date_trouvaille?: string;
  date_trouvee?: string;
  date_perte?: string;
  created_at?: string;
  ville?: string;
  city?: string;
  location?: string;
  found_location?: string | { city?: string; label?: string; address?: string; lat?: number; lon?: number; lng?: number };
  pays?: string;
  country?: string;
  status?: string;
}

const ENV_API_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;
const API_BASE = ENV_API_URL
  ? ENV_API_URL.replace(/\/+$/, "") + "/api/"
  : "/api/";

function Metric({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div>
      <p className={`font-bricolage text-[26px] font-bold leading-none tracking-tight ${color}`}>
        {value}
        {suffix && <span className="text-[15px] font-semibold text-textMuted">{suffix}</span>}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
        {label}
      </p>
    </div>
  );
}

export default function DocTypeDetail() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const params = useParams<{ code: string }>();
  const wanted = decodeURIComponent(params.code || "");

  const [period, setPeriod] = useState<StatsPeriod>("month");
  const [catalogue, setCatalogue] = useState<CatalogueType[]>([]);
  const [typeStats, setTypeStats] = useState<DocTypeStats[]>([]);
  const [publicDocs, setPublicDocs] = useState<PublicDoc[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<PublicDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}declarations/stats-by-type?period=${period}`, {
        headers: { Accept: "application/json" },
      });
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
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}document-types/active`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setCatalogue(data.data);
        }
      } catch {
        if (!cancelled) setCatalogue([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // `stats-by-type` omet les types à zéro : on repasse par le catalogue pour que la page détail
  // affiche « 0 sur la période » plutôt qu'un écran « introuvable » mensonger.
  const card = useMemo<DocTypeCard | null>(() => {
    if (!catalogue.length) return null;
    const cards = buildDocTypeCards(catalogue, typeStats);
    const upper = normalizeDocTypeCode(wanted);
    return cards.find((c) => c.code === upper || c.id === wanted) || null;
  }, [catalogue, typeStats, wanted]);

  // Les cartes récentes reprennent le même visuel que la grille de recherche publique
  // (photo verrouillée, propriétaire masqué, référence) : elles viennent de `public-recent`,
  // qui couvre aussi les documents déjà appariés ou retournés — `search-public` ne renvoyant
  // que les AVAILABLE, la section resterait vide dans la plupart des bases.
  useEffect(() => {
    if (!card) return;
    let cancelled = false;
    setRecentLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}declarations/public-recent?type=${encodeURIComponent(card.id)}&limit=8`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok || cancelled) return;
        const payload = await res.json();
        if (!cancelled && Array.isArray(payload.data)) {
          setPublicDocs(payload.data as PublicDoc[]);
        }
      } catch {
        if (!cancelled) setPublicDocs([]);
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [card?.id]);

  const recentItems = card ? foundRecentItems(card.stats).slice(0, 8) : [];
  const returnRate =
    card && card.stats.found > 0
      ? Math.round((card.stats.returned / card.stats.found) * 100)
      : 0;

  const formatDate = (raw?: string | null): string => {
    if (!raw) return "—";
    const date = new Date(raw);
    if (isNaN(date.getTime())) return raw;
    return date.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const docDateRaw = (doc: PublicDoc): string =>
    doc.date_trouvaille || doc.date_trouvee || doc.date_perte || doc.created_at || "";

  const docOwnerName = (doc: PublicDoc): string =>
    doc.owner_name ||
    doc.document_owner ||
    doc.nom_sur_doc ||
    doc.nom_complet ||
    t("rechercher_owner_unknown");

  const docPhoto = (doc: PublicDoc): string =>
    doc.photo_recto || doc.photo || doc.image_url || "";

  const docLocation = (doc: PublicDoc): string => {
    let location: unknown = doc.found_location || doc.location || doc.ville || doc.city;
    if (typeof location === "string") {
      try {
        location = JSON.parse(location);
      } catch {
        return location || t("rechercher_location_unknown");
      }
    }
    if (location && typeof location === "object") {
      const value = location as Record<string, unknown>;
      const label = value.city || value.label || value.address || value.quartier;
      if (typeof label === "string" && label.trim()) return label;
      const lat = value.lat;
      const lon = value.lon ?? value.lng;
      if (typeof lat === "number" && typeof lon === "number") {
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
      return t("rechercher_location_unknown");
    }
    return typeof location === "string" && location ? location : t("rechercher_location_unknown");
  };

  const docStatus = (doc: PublicDoc): string => {
    const status = (doc.status || "AVAILABLE").toUpperCase();
    return status === "AVAILABLE" ? t("rechercher_status_available") : status;
  };

  const docReference = (doc: PublicDoc): string => {
    const ref = doc.identifiant_doc_dm;
    if (ref && !isIdLike(ref)) return ref;
    const num = doc.numero_doc || doc.document_number || doc.numero_document;
    if (num && !isIdLike(num)) return num;
    return "";
  };

  const declareTo = (id: string | number): string =>
    user
      ? `/declarer?from=${encodeURIComponent(String(id))}`
      : `/login?redirect=${encodeURIComponent(`/declarer?from=${id}`)}`;

  // `public-recent` est déjà filtré côté serveur sur le type : aucun re-filtrage ici.
  const recentDocs = publicDocs.slice(0, 8);

  const modalData: PublicDocumentDetailData | null = selectedDoc
    ? {
        id: selectedDoc.id,
        docType: card?.name || selectedDoc.docTypeInfo?.nom || t("rechercher_document"),
        ownerName: docOwnerName(selectedDoc),
        photoUrl: docPhoto(selectedDoc)
          ? resolvePublicImageUrl(docPhoto(selectedDoc))
          : undefined,
        dateText: formatDate(docDateRaw(selectedDoc)),
        dateRelative: formatRetrouveTimeAgo(docDateRaw(selectedDoc), lang),
        location: docLocation(selectedDoc),
        country: selectedDoc.pays || selectedDoc.country || "Cameroun",
        status: docStatus(selectedDoc),
        reference: docReference(selectedDoc) || undefined,
        isAuthenticated: Boolean(user),
        ctaTo: declareTo(selectedDoc.id),
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F7F7F7" }}>
      <div
        className="flex-1 pb-14"
        style={{ paddingTop: "calc(72px + var(--promo-offset, 0px) + 24px)" }}
      >
        <div className="max-w-7xl mx-auto px-5 w-full">
          <Link
            to="/recherche-publique"
            className="inline-flex items-center gap-2 text-[13px] font-bold text-textMuted hover:text-textMain transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
            {t("rechercher_type_back")}
          </Link>

          {!loading && !card && (
            <div className="mt-6 bg-white border border-borderMain rounded-3xl p-8 flex flex-col items-center text-center">
              <i className="fa-solid fa-circle-question text-2xl text-textMuted mb-4" />
              <h1 className="font-bricolage text-xl font-black text-textMain">
                {t("rechercher_type_not_found")}
              </h1>
              <p className="text-textMuted text-sm mt-2 max-w-md">{t("rechercher_type_not_found_desc")}</p>
            </div>
          )}

          {card && (
            <>
              <header className="mt-5">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <i className={`fa-solid ${card.icon} mt-1 text-lg text-textMuted shrink-0`} />
                    <div className="min-w-0">
                      <h1 className="font-bricolage text-2xl md:text-3xl font-bold text-textMain tracking-normal truncate">
                        {card.name}
                      </h1>
                      <p className="mt-1.5 text-[12px] font-medium text-textMuted">
                        {t("rechercher_type_subtitle")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap shrink-0">
                    {STATS_PERIODS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        aria-pressed={period === p}
                        className={
                          "px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-colors " +
                          (period === p
                            ? "bg-green-dark text-white border-transparent"
                            : "bg-white border-borderMain text-textMuted hover:bg-surface2")
                        }
                      >
                        {t(`dashboard_period_${p}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </header>

              {loading && (
                <div className="mt-6 hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-white border border-borderMain rounded-2xl animate-pulse" />
                  ))}
                </div>
              )}

              {!loading && statsError && (
                <div className="mt-6 bg-white border border-borderMain rounded-2xl p-6 flex items-center gap-3">
                  <i className="fa-solid fa-triangle-exclamation text-textMuted" />
                  <p className="text-sm font-semibold text-textMain">{t("rechercher_type_stats_error")}</p>
                </div>
              )}

              {!loading && !statsError && (
                <>
                  <div className="mt-5 hidden sm:flex flex-wrap items-end gap-x-8 gap-y-3">
                    <Metric label={t("dashboard_perf_found")} value={card.stats.found} color="text-green-dark" />
                    <Metric label={t("dashboard_perf_returned")} value={card.stats.returned} color="text-primary" />
                    <Metric
                      label={t("rechercher_kpi_rate")}
                      value={returnRate}
                      suffix="%"
                      color="text-green-mid"
                    />
                    <span className="text-[11px] font-medium text-textMuted">
                      {t(`dashboard_this_${period}`)}
                    </span>
                  </div>

                  <section className="mt-8">
                    <h2 className="font-bricolage text-lg md:text-xl font-bold text-textMain">
                      {t("rechercher_type_recent")}
                    </h2>
                    {recentLoading ? (
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-white border border-borderMain rounded-3xl overflow-hidden">
                            <div className="h-44 bg-surface2 animate-pulse" />
                            <div className="p-5 space-y-3">
                              <div className="h-3 w-24 bg-surface2 rounded animate-pulse" />
                              <div className="h-4 w-40 bg-surface2 rounded animate-pulse" />
                              <div className="h-8 bg-surface2 rounded-xl animate-pulse" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : recentDocs.length === 0 && recentItems.length === 0 ? (
                      <div className="mt-5 flex flex-col items-center justify-center py-14 text-center px-5">
                        <div className="w-20 h-20 rounded-2xl border border-borderMain bg-white flex items-center justify-center mb-6">
                          <i className="fa-solid fa-folder-open text-2xl text-textMuted" />
                        </div>
                        <h3 className="font-bricolage text-xl font-bold text-textMain mb-2">
                          {t("rechercher_type_recent_empty")}
                        </h3>
                        <p className="text-textMuted text-sm max-w-md leading-relaxed">
                          {t("rechercher_type_recent_empty_desc")}
                        </p>
                      </div>
                    ) : recentDocs.length > 0 ? (
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recentDocs.map((doc) => (
                          <PublicDocumentCard
                            key={String(doc.id)}
                            docType={card.name}
                            ownerName={docOwnerName(doc)}
                            photo={docPhoto(doc) ? resolvePublicImageUrl(docPhoto(doc)) : undefined}
                            reference={docReference(doc) || undefined}
                            dateRelative={formatRetrouveTimeAgo(docDateRaw(doc), lang)}
                            location={docLocation(doc)}
                            isAuthenticated={Boolean(user)}
                            onOpen={() => setSelectedDoc(doc)}
                            actions={
                              <Link
                                to={declareTo(doc.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-green-dark hover:bg-green-mid transition-colors"
                              >
                                <i className="fa-solid fa-file-circle-plus text-xs" />
                                {t("rechercher_its_mine")}
                              </Link>
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentItems.map((item) => {
                          const ville = item.ville || t("rechercher_location_unknown");

                          return (
                            <article
                              key={item.id}
                              className="bg-white border border-borderMain rounded-2xl p-4 flex flex-col transition-shadow hover:shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-textMuted">
                                  <i className="fa-solid fa-circle-check text-[10px]" />
                                  {t("rechercher_found_doc")}
                                </span>
                                <span className="text-[11px] font-medium text-textMuted whitespace-nowrap">
                                  {formatRetrouveTimeAgo(item.date, lang)}
                                </span>
                              </div>

                              <h3
                                className="mt-3 font-bricolage text-[17px] font-bold text-textMain truncate"
                                title={ville}
                              >
                                {ville}
                              </h3>

                              <p className="mt-1 flex items-center gap-2 text-[12px] font-medium text-textMuted">
                                <i className="fa-regular fa-calendar text-[11px]" />
                                {formatDate(item.date)}
                              </p>

                              <div className="mt-4 pt-3 border-t border-borderMain">
                                <Link
                                  to={declareTo(item.id)}
                                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-dark px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-green-mid"
                                >
                                  <i className="fa-solid fa-file-circle-plus text-xs" />
                                  {t("rechercher_its_mine")}
                                </Link>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    {card.stats.found > 0 && (
                      <Link
                        to={`/recherche-publique?type=${encodeURIComponent(card.code || card.id)}`}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-green-dark hover:bg-green-mid transition-colors"
                      >
                        <i className="fa-solid fa-magnifying-glass text-xs" />
                        {t("rechercher_type_cta")}
                      </Link>
                    )}
                    <Link
                      to="/recherche-publique"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-borderMain bg-white text-sm font-bold text-textMain hover:bg-surface2 transition-colors"
                    >
                      <i className="fa-solid fa-layer-group text-xs" />
                      {t("rechercher_types_title")}
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />

      {modalData && (
        <PublicDocumentDetailModal doc={modalData} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}
