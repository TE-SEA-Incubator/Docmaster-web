import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import Footer from "../../layout/Footer";

interface DocResult {
  id: string | number;
  score?: number;
  type_doc?: string;
  document_type?: string;
  doc_type?: string;
  nom_sur_doc?: string;
  owner_name?: string;
  document_owner?: string;
  numero_doc?: string;
  document_number?: string;
  photo_recto?: string;
  photo?: string;
  image_url?: string;
  created_at?: string;
  location?: string;
  ville?: string;
  city?: string;
  pays?: string;
  country?: string;
  description?: string;
  document_owner_phone?: string;
  counterPart?: boolean;
  declaration_id?: string;
  document_type_id?: string;
  doc_type_id?: string;
}

interface DocType {
  id: string;
  nom: string;
  icon?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "/api/";

function getFullImageUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return window.location.origin + "/" + url.replace(/^\//, "");
}

export default function Rechercher() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [allDocs, setAllDocs] = useState<DocResult[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("recent");
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [visibleCount, setVisibleCount] = useState(9);
  const [totalCount, setTotalCount] = useState(0);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `${API_BASE}declarations/search-public?q=${encodeURIComponent(searchQuery)}`
        : `${API_BASE}declarations/search-public`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      const docs: DocResult[] = data.data || [];
      setAllDocs(docs);
      setFilteredDocs(docs);
      setTotalCount(docs.length);
    } catch {
      showSampleDocuments();
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}document-types/active`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDocTypes(data.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadDocTypes();
    loadDocs(searchParams.get("q") || undefined);
  }, []);

  useEffect(() => {
    let docs = [...allDocs];

    if (selectedFilter !== "all") {
      docs = docs.filter(
        (d) =>
          d.document_type_id === selectedFilter || d.doc_type_id === selectedFilter
      );
    }

    if (sortOrder === "alpha") {
      docs.sort((a, b) =>
        (a.document_owner || a.owner_name || "").localeCompare(
          b.document_owner || b.owner_name || ""
        )
      );
    } else {
      docs.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    }

    setFilteredDocs(docs);
    setVisibleCount(9);
  }, [selectedFilter, sortOrder, allDocs]);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE}declarations/search-public?q=${encodeURIComponent(query.trim())}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      const docs: DocResult[] = data.data || [];
      setAllDocs(docs);
      setTotalCount(docs.length);
    } catch {
      setAllDocs([]);
      setTotalCount(0);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const showSampleDocuments = () => {
    const samples: DocResult[] = [
      { id: 1, type_doc: "CNI", owner_name: "Jean Dupont", document_number: "CE123456789", ville: "Yaoundé", pays: "Cameroun", created_at: new Date().toISOString(), score: 0.85 },
      { id: 2, type_doc: "Passeport", owner_name: "Awa Traoré", document_number: "PA987654321", ville: "Douala", pays: "Cameroun", created_at: new Date().toISOString(), score: 0.92 },
      { id: 3, type_doc: "Acte de naissance", owner_name: "Marie Curie", document_number: "ACT456789123", ville: "Yaoundé", pays: "Cameroun", created_at: new Date().toISOString(), score: 0.78 },
    ];
    setAllDocs(samples);
    setFilteredDocs(samples);
    setTotalCount(samples.length);
  };

  const visibleDocs = filteredDocs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredDocs.length;

  const getDocType = (doc: DocResult): string =>
    doc.document_type || doc.type_doc || doc.doc_type || t("rechercher_document");

  const getOwnerName = (doc: DocResult): string =>
    doc.document_owner || doc.owner_name || doc.nom_sur_doc || t("rechercher_owner_unknown");

  const getPhoto = (doc: DocResult): string =>
    doc.photo_recto || doc.photo || doc.image_url || "";

  const getLocation = (doc: DocResult): string =>
    doc.location || doc.ville || doc.city || t("rechercher_location_unknown");

  const getCountry = (doc: DocResult): string =>
    doc.country || doc.pays || "Cameroun";

  const getDate = (doc: DocResult): string =>
    doc.created_at
      ? new Date(doc.created_at).toLocaleDateString("fr-FR")
      : new Date().toLocaleDateString("fr-FR");

  const getDocNumber = (doc: DocResult): string =>
    doc.numero_doc || doc.document_number || t("rechercher_number_unavailable");

  const hasDeclaration = (doc: DocResult): boolean =>
    Boolean(
      doc.document_owner || doc.owner_name || doc.declaration_id || doc.counterPart
    );

  const getScore = (doc: DocResult): number =>
    Math.round((doc.score || 0) * 100);

  return (
    <div className="min-h-screen bg-bgMain">
      {/* ═══ HERO / SEARCH SECTION ═══ */}
      <section
        className="relative overflow-hidden pt-[68px]"
        style={{
          background: "linear-gradient(135deg,#1E3A2F 0%,#2D5A42 50%,#1E3A2F 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#F5A64B 1px,transparent 1px),linear-gradient(90deg,#F5A64B 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/8 rounded-full blur-[60px]" />

        <div className="relative z-10 max-w-5xl mx-auto px-5 py-14 lg:py-20">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/15 border border-primary/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-black text-primary/90 uppercase tracking-widest">
                {t("rechercher_realtime_db")}
              </span>
            </div>
          </div>

          <h1 className="font-bricolage text-3xl md:text-5xl font-black text-white text-center tracking-tighter mb-3">
            {t("rechercher_search_title")}{" "}
            <span className="text-primary">{totalCount.toLocaleString("fr-FR")}</span>{" "}
            {t("rechercher_declarations")}
          </h1>
          <p className="text-white/50 text-center text-[15px] mb-10">
            {t("rechercher_search_subtitle")}
          </p>

          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-[28px] p-5 md:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row gap-4 mb-5">
              <div className="flex-1 relative flex items-center bg-white rounded-2xl border-2 border-transparent focus-within:border-primary transition-all shadow-sm">
                <div className="pl-4 text-gray-400">
                  <i className="fa-solid fa-magnifying-glass text-base" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={t("rechercher_search_placeholder")}
                  className="w-full px-4 py-4 bg-transparent outline-none text-[15px] text-gray-800 font-medium placeholder:text-gray-400"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(""); loadDocs(); }}
                    className="pr-4 text-gray-300 hover:text-primary transition-all"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>
              <div className="relative min-w-[200px]">
                <div className="absolute left-0 inset-y-0 flex items-center pl-4 pointer-events-none">
                  <i className="fa-solid fa-calendar-days text-primary text-sm" />
                </div>
                <input
                  ref={dateInputRef}
                  type="text"
                  placeholder={t("rechercher_filter_date")}
                  className="w-full h-full pl-11 pr-4 py-4 bg-white rounded-2xl border-2 border-transparent hover:border-primary/30 focus:border-primary transition-all outline-none text-[14px] font-medium text-gray-700 placeholder:text-gray-400 cursor-pointer shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white/50 text-xs font-bold uppercase tracking-widest mr-1 hidden sm:inline">
                {t("rechercher_filter")} :
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`filter-chip px-4 py-2 rounded-full border text-[12px] font-bold transition-all ${
                    selectedFilter === "all"
                      ? "bg-primary/80 text-white border-primary/80"
                      : "border-white/20 text-white/70 hover:border-primary/50"
                  }`}
                >
                  {t("rechercher_all")}{" "}
                  <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">
                    {allDocs.length}
                  </span>
                </button>
                {docTypes.map((dt) => (
                  <button
                    key={dt.id}
                    onClick={() => setSelectedFilter(dt.id)}
                    className={`filter-chip px-4 py-2 rounded-full border text-[12px] font-bold transition-all ${
                      selectedFilter === dt.id
                        ? "bg-primary/80 text-white border-primary/80"
                        : "border-white/20 text-white/70 hover:border-primary/50"
                    }`}
                  >
                    <i className="fa-solid fa-file-lines text-[10px] mr-1" />
                    {dt.nom}
                  </button>
                ))}
              </div>
              <div className="ml-auto">
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="flex items-center gap-2.5 px-7 py-3 bg-primary text-secondary rounded-2xl font-black text-[14px] shadow-xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-60"
                >
                  {searching ? (
                    <i className="fa-solid fa-circle-notch fa-spin" />
                  ) : (
                    <>
                      <i className="fa-solid fa-magnifying-glass" /> {t("rechercher_search_btn")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ RESULTS SECTION ═══ */}
      <main className="max-w-7xl mx-auto px-5 py-12 pb-28 md:pb-12 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-bricolage text-2xl font-black text-textMain tracking-tighter">
              {query
                ? t("rechercher_results")
                : t("rechercher_recent")}
            </h2>
            <p className="text-textMuted text-sm mt-0.5">
              {loading
                ? t("rechercher_loading")
                : `${filteredDocs.length} ${t("rechercher_result")}${filteredDocs.length > 1 ? "s" : ""} ${t("rechercher_found")}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-textMuted font-bold uppercase tracking-wider hidden sm:inline">
              {t("rechercher_sort")} :
            </span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-2.5 bg-white border border-borda rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="recent">{t("rechercher_most_recent")}</option>
              <option value="alpha">{t("rechercher_alphabetic")}</option>
            </select>
          </div>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-[24px] p-5 border border-borda">
                <div className="skeleton h-40 w-full mb-4 rounded-xl bg-gray-200 animate-pulse" />
                <div className="skeleton h-4 w-3/4 mb-2 rounded bg-gray-200 animate-pulse" />
                <div className="skeleton h-4 w-1/2 mb-4 rounded bg-gray-200 animate-pulse" />
                <div className="skeleton h-10 w-full rounded-xl bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Results grid */}
        {!loading && visibleDocs.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleDocs.map((doc, i) => {
                const score = getScore(doc);
                const photo = getPhoto(doc);
                const docType = getDocType(doc);
                const ownerName = getOwnerName(doc);
                const dateText = getDate(doc);
                const locationText = getLocation(doc);
                const countryText = getCountry(doc);
                const docNumber = getDocNumber(doc);
                const hasDecl = hasDeclaration(doc);

                if (!hasDecl) {
                  return (
                    <div
                      key={doc.id}
                      className="doc-card group bg-white border border-borda rounded-[24px] overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="relative h-40 bg-surface2 flex items-center justify-center overflow-hidden">
                        {photo ? (
                          <img
                            src={getFullImageUrl(photo)}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <i className="fa-solid fa-file-lines text-primary text-3xl" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase border border-borda text-textMain">
                            <i className="fa-solid fa-shield-halved text-primary" />{" "}
                            {docType}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                            {t("rechercher_document")}
                          </span>
                          <span className="text-[10px] font-bold text-textMain">
                            {dateText}
                          </span>
                        </div>
                        <h3 className="font-bricolage font-bold text-textMain text-[17px] mb-3">
                          {docType}
                        </h3>
                        <div className="text-[13px] text-textMuted mb-4">
                          <i className="fa-solid fa-location-dot text-primary mr-2" />
                          <span className="font-medium">{locationText}</span>
                        </div>
                        <Link
                          to={`/recuperer?id=${doc.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary-dark transition-all shadow-md"
                        >
                          {t("rechercher_view_details")}
                        </Link>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={doc.id}
                    className="doc-card group bg-white border border-borda rounded-[24px] overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="relative h-48 bg-surface2 flex items-center justify-center overflow-hidden">
                      {photo ? (
                        <img
                          src={getFullImageUrl(photo)}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 blur-[5px]"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                          <i className="fa-solid fa-file-lines text-primary text-3xl" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase border border-borda text-textMain">
                          <i className="fa-solid fa-shield-halved text-primary" />{" "}
                          {docType}
                        </span>
                      </div>
                      {score > 30 && (
                        <div className="match-score-badge absolute bottom-[-10px] left-1/2 -translate-x-1/2 bg-primary text-black font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-lg z-5">
                          {score}% MATCH
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                          {t("rechercher_found_doc")}
                        </span>
                        <span className="text-[10px] font-bold text-textMain">
                          {dateText}
                        </span>
                      </div>

                      <h3 className="font-bricolage font-bold text-textMain text-[17px] mb-4">
                        {ownerName}
                      </h3>

                      <div className="space-y-2 mb-4">
                        <p className="text-[12px] text-textMuted flex items-center gap-1.5">
                          <i className="fa-solid fa-hashtag text-[10px] text-primary/50" />
                          <span className="blur-sm select-none font-mono text-[11px] opacity-80 pointer-events-none">
                            {docNumber}
                          </span>
                        </p>
                        <div className="flex items-center gap-2 py-2 border-y border-borda/50">
                          <i className="fa-solid fa-location-dot text-primary text-[11px]" />
                          <span className="blur-sm select-none text-[12px] font-medium opacity-80 pointer-events-none">
                            {locationText}, {countryText}
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/recuperer?id=${doc.id}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-secondary rounded-[14px] font-bold text-[13px] hover:bg-primary-dark transition-all shadow-md shadow-primary/20 active:scale-95"
                      >
                        <i className="fa-solid fa-hand-holding-heart text-xs" /> {t("rechercher_its_mine")}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 9)}
                  className="inline-flex items-center gap-2.5 px-8 py-4 bg-secondary text-white rounded-[18px] font-bold text-[14px] hover:bg-green-mid transition-all shadow-lg shadow-secondary/20"
                >
                  {t("rechercher_load_more")}{" "}
                  <i className="fa-solid fa-chevron-down text-xs" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && visibleDocs.length === 0 && !searching && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-5">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary text-5xl border-2 border-primary/30">
                <i className="fa-solid fa-magnifying-glass" />
              </div>
            </div>

            <h3 className="font-bricolage text-2xl font-black text-textMain mb-3">
              {t("rechercher_no_results")}
            </h3>

            <p className="text-textMuted text-sm mb-8 max-w-md leading-relaxed">
              {t("rechercher_no_results_desc")}
              <span className="block mt-2">
                {t("rechercher_no_results_hint")}
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/declarer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-secondary rounded-2xl font-bold text-sm shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
              >
                <i className="fa-solid fa-file-circle-plus text-base" /> {t("rechercher_declare_loss")}
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white border-2 border-primary text-primary rounded-2xl font-bold text-sm hover:bg-primary/5 transition-all active:scale-95"
              >
                <i className="fa-solid fa-arrow-left text-base" /> {t("rechercher_back_home")}
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Flatpickr styles */}
       <style>{`
         .filter-chip { cursor: pointer; transition: all 0.2s ease; }
         .filter-chip:hover:not(.bg-primary\\/80) { border-color: #F5A64B; color: #F5A64B; }
         .doc-card { transition: transform 0.25s, box-shadow 0.25s; }
         .doc-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px -12px rgba(30,58,47,0.15); }
         .skeleton { background: linear-gradient(90deg, #EAE3D8 25%, #F4EFE6 50%, #EAE3D8 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.4s infinite; }
         @keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
         @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
         .animate-fade-in { animation: fadeIn 0.5s ease forwards; }
         .match-score-badge { box-shadow: 0 4px 10px rgba(245,166,75,0.3); }
        `}</style>
        <Footer></Footer>
      </div>
    );
}
