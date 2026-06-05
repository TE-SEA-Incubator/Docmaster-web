import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useAuth } from "../../context/AuthContext";
import { declarationsService, documentTypesService } from "../../services/declarationsService";
import { API_BASE_URL } from "../../services/api";
import Topbar from "../../layout/Topbar";
import type { Declaration, DocTypeCatalog } from "../../types/api";

const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/?$/, "");

function getFullImageUrl(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${BACKEND_ROOT}/${path.replace(/^\//, "")}`;
}

function formatDate(d: string | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

interface ResultDoc {
  id: string;
  owner_name?: string;
  date_trouvaille?: string;
  date_perte?: string;
  created_at?: string;
  ville?: string;
  photo_recto?: string;
  document_type?: string;
  docTypeInfo?: { nom: string };
  [key: string]: unknown;
}

export default function Rechercher() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<ResultDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);

  // Check if we have pre-loaded potential match IDs from Dashboard
  const potentialIds = (location.state as { potentialIds?: string[] } | null)?.potentialIds;
  const isMatchView = !!potentialIds && potentialIds.length > 0;

  const checkUserHasLost = useCallback(async () => {
    try {
      const res = await declarationsService.getMyDeclarations();
      if (res.success && res.data) {
        const has = res.data.some(
          (d) => d.type === "lost" && !["RETURNED", "CANCELLED", "CLAIMED"].includes(d.status)
        );
        setHasLost(has);
      }
    } catch (e: any) {
      console.error("[Rechercher] checkUserHasLost error:", e?.response?.data || e);
      setHasLost(false);
    }
  }, []);

  useEffect(() => {
    checkUserHasLost();
    documentTypesService.getActive().then((res) => {
      if (res.success && res.data) setDocTypes(res.data);
    }).catch((e: any) => {
      console.error("[Rechercher] Failed to load doc types:", e);
    });
  }, [checkUserHasLost]);

  // Load potential matches from Dashboard if provided
  useEffect(() => {
    if (potentialIds && potentialIds.length > 0) {
      setLoading(true);
      Promise.all(
        potentialIds.map((id: string) =>
          declarationsService.getById(id).then((res) => res.data).catch(() => null)
        )
      ).then((decls) => {
        setResults(decls.filter(Boolean) as ResultDoc[]);
      }).finally(() => setLoading(false));
    }
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await declarationsService.searchPublic(searchQuery || "");
      const docs: ResultDoc[] = (res.data || []) as ResultDoc[];
      setResults(docs);

      const newUrl = searchQuery
        ? `?q=${encodeURIComponent(searchQuery)}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    } catch (e: any) {
      console.error("[Rechercher] performSearch error:", e?.response?.data || e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (potentialIds && potentialIds.length > 0) return;
    const q = searchParams.get("q");
    if (q) {
      performSearch(q);
    } else {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => performSearch(query.trim());

  const quickFilters = ["CNI", "Passeport", "Permis", "Diplôme"];

  const initials = user?.initial || "DM";
  const userName = user?.prenom || user?.nom || "";

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={isMatchView ? t("rechercher_potential_matches") : t("rechercher_search_page")}
        breadcrumbs={[
          { label: isMatchView ? t("rechercher_matches") : t("rechercher_search_page") },
        ]}
      />

      <div className="custom-scroll p-4 sm:p-6 flex flex-col gap-5 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full space-y-6">
          {isMatchView ? (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-[16px] p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-orange-100 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-magnifying-glass-chart text-orange-600 text-lg" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-orange-900">{t("rechercher_matches_detected")}</p>
                <p className="text-[12px] text-orange-700/80 mt-0.5">
                  {t("rechercher_matches_desc")} <strong>{t("rechercher_its_mine")}</strong> {t("rechercher_matches_desc2")}
                </p>
              </div>
              <button
                onClick={() => {
                  navigate("/rechercher", { replace: true });
                }}
                className="ml-auto px-3 py-1.5 bg-white border border-orange-200 rounded-xl text-[11px] font-bold text-orange-700 hover:bg-orange-50 transition-all shrink-0"
              >
                <i className="fa-solid fa-xmark mr-1" /> {t("rechercher_close")}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-borderMain rounded-[16px] p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="fa-solid fa-shield-halved text-primary text-sm" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-textMain">{t("rechercher_data_protection")}</p>
                <p className="text-[11.5px] text-textMuted mt-0.5">
                  {t("rechercher_data_protection_desc")}
                </p>
              </div>
            </div>
          )}

          {/* Search section (hidden in match view) */}
          {!isMatchView && (
            <div className="bg-white border border-borderMain rounded-[20px] p-5 shadow-sm">
              <div className="relative flex items-center bg-bgMain border border-borderMain rounded-[14px] overflow-hidden focus-within:border-primary transition-all">
                <i className="fa-solid fa-magnifying-glass pl-4 text-textMuted text-base" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={t("rechercher_search_placeholder")}
                  className="flex-1 py-4 px-3 bg-transparent outline-none text-[14px] text-textMain placeholder:text-textMuted"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(""); setResults([]); }}
                    className="pr-3 text-textMuted hover:text-red-500 transition-colors"
                  >
                    <i className="fa-solid fa-circle-xmark text-lg" />
                  </button>
                )}
                <button
                  onClick={handleSearch}
                  className="bg-primary text-white font-bricolage font-bold px-6 py-2.5 mr-2 rounded-[11px] hover:bg-primary-dark transition-all active:scale-95 shadow-lg shadow-primary/20 text-[13px]"
                >
                  {t("rechercher_search_btn")}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider mr-1">
                  {t("rechercher_quick_filters")} :
                </span>
                {quickFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setQuery(f); performSearch(f); }}
                    className="px-3.5 py-1.5 bg-white border border-borderMain rounded-full text-[11.5px] font-medium text-textMain hover:border-primary hover:text-primary transition-all"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-borderMain rounded-[20px] overflow-hidden animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-10 bg-gray-200 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-bgMain border border-borderMain flex items-center justify-center mb-5">
                <i className="fa-solid fa-magnifying-glass text-3xl text-textMuted" />
              </div>
              <h3 className="font-bricolage text-xl font-black text-textMain mb-2">
                {isMatchView ? t("rechercher_no_matches_loaded") : t("rechercher_no_results")}
              </h3>
              <p className="text-textMuted text-[13px] mb-6 max-w-sm">
                {isMatchView
                  ? t("rechercher_no_matches_desc")
                  : t("rechercher_no_results_desc_auth")}
              </p>
              {!isMatchView && (
                <Link
                  to="/declarer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  <i className="fa-solid fa-file-circle-plus" /> {t("rechercher_declare_loss")}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((doc) => {
                const photoUrl = getFullImageUrl(doc.photo_recto);
                const displayName = typeof doc.owner_name === "string" ? doc.owner_name : t("rechercher_owner");
                const dateField = typeof doc.date_trouvaille === "string" ? doc.date_trouvaille : typeof doc.date_perte === "string" ? doc.date_perte : typeof doc.created_at === "string" ? doc.created_at : "";
                const location = typeof doc.ville === "string" ? doc.ville : "";
                const rawDocType = doc.docTypeInfo;
                const docType = rawDocType && typeof rawDocType === "object" && "nom" in rawDocType && typeof (rawDocType as Record<string, unknown>).nom === "string" ? (rawDocType as Record<string, unknown>).nom : typeof doc.document_type === "string" ? doc.document_type : t("rechercher_document");
                const showFull = isMatchView || hasLost;

                return (
                  <div
                    key={doc.id}
                    className="bg-white border border-borderMain rounded-[20px] overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col"
                  >
                    {/* Photo */}
                    <div className="relative h-44 bg-gradient-to-br from-surface2 to-bgMain overflow-hidden">
                      {photoUrl && showFull ? (
                        <img
                          src={photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center px-4">
                          <div className="font-bricolage text-[10px] font-extrabold tracking-[0.2em] text-textMuted uppercase mb-1">
                            {t("rechercher_photo_protected")}
                          </div>
                          <p className="text-[11px] text-textMuted/60 text-center">
                            {t("rechercher_visible_after_declaration")}
                          </p>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur rounded-full text-[9px] font-bold text-textMain border border-borderMain">
                          <i className="fa-solid fa-file-lines text-primary text-[9px]" /> {docType}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-textMuted uppercase">{t("rechercher_owner_label")} :</span>
                        <span className="text-[13px] font-semibold text-textMain">{displayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-textMuted uppercase">{t("rechercher_date_label")} :</span>
                        <span className="text-[12px] font-mono font-bold text-primary">{formatDate(dateField)}</span>
                      </div>
                      {location && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-textMuted uppercase">{t("rechercher_location_label")} :</span>
                          <span className="text-[12px] font-medium text-textMain">{location}</span>
                        </div>
                      )}

                      <div className="mt-auto pt-3">
                        {showFull ? (
                          <Link
                            to={`/recuperer?id=${doc.id}`}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-[12px] hover:bg-primary-dark transition-all active:scale-[0.99] shadow-md shadow-primary/20"
                          >
                            <i className="fa-solid fa-hand-holding-heart" />
                            {t("rechercher_its_mine")}
                          </Link>
                        ) : (
                          <Link
                            to="/declarer"
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-bgMain border border-borderMain text-textMain rounded-xl font-bold text-[12px] hover:border-primary hover:text-primary transition-all"
                          >
                            <i className="fa-solid fa-file-circle-plus" />
                            {t("rechercher_declare_to_see")}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
