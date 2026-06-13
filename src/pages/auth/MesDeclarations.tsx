import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { declarationsService, documentTypesService } from "../../services/declarationsService";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import Topbar from "../../layout/Topbar";
import type { Declaration } from "../../types/api";

interface DeclarationExtended extends Declaration {
  declaration_type?: string;
  identifiant_doc_dm?: string;
  docTypeInfo?: { nom: string };
  doc_type?: string;
  owner_name?: string;
  ville?: string;
  region?: string;
  pays?: string;
  photo_recto?: string;
  photo_verso?: string;
  etat_physique?: string;
  date_expiration?: string;
  document_number?: string;
  metadata?: Record<string, string>;
}

type Filter = "all" | "perdu" | "trouve";

function getStatusMeta(t: (k: string) => string, status?: string) {
  const meta: Record<string, { label: string; cls: string }> = {
    MATCHED:    { label: t("mesdeclarations_status_match"),     cls: "bg-green-100 text-green-700 border-green-200 animate-pulse" },
    RETURNED:   { label: t("mesdeclarations_status_closed"),    cls: "bg-gray-100 text-gray-700 border-gray-200" },
    RESOLVED:   { label: t("mesdeclarations_status_resolved"),  cls: "bg-green-50 text-green-700 border-green-100" },
    NEW:        { label: t("mesdeclarations_status_new"),       cls: "bg-blue-50 text-blue-700 border-blue-100" },
    EN_COURS:   { label: t("mesdeclarations_status_pending"),   cls: "bg-amber-50 text-amber-700 border-amber-100" },
  };
  return meta[status || ""] || { label: t("mesdeclarations_status_pending"), cls: "bg-amber-50 text-amber-700 border-amber-100" };
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function MesDeclarations() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [allDeclarations, setAllDeclarations] = useState<DeclarationExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [docTypeMap, setDocTypeMap] = useState<Record<string, string>>({});

  const getDocTypeName = useCallback((decl: DeclarationExtended): string => {
    if (decl.docTypeInfo?.nom) return decl.docTypeInfo.nom;
    const id = decl.doc_type;
    if (id && docTypeMap[id]) return docTypeMap[id];
    return decl.document_type || t("mesdeclarations_document_fallback");
  }, [docTypeMap]);

  // Initial filter from URL ?type=perdu|trouve
  useEffect(() => {
    const t = searchParams.get("type");
    if (t === "perdu" || t === "trouve") setFilter(t);
  }, []);

  // Load document type names to resolve UUIDs
  useEffect(() => {
    documentTypesService.getActive().then((res) => {
      console.log("[MesDeclarations] getActive doc types response:", res);
      if (res.success && Array.isArray(res.data)) {
        const map: Record<string, string> = {};
        for (const d of res.data) {
          map[d.id] = d.nom;
        }
        setDocTypeMap(map);
      }
    }).catch((e: any) => {
      console.error("[MesDeclarations] Failed to load doc types:", e);
    });
  }, []);

  const fetchDeclarations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await declarationsService.getMyDeclarations();
      console.log("[MesDeclarations] getMyDeclarations response:", res);
      setAllDeclarations((res.data || []) as DeclarationExtended[]);
    } catch (e: any) {
      console.error("[MesDeclarations] fetchDeclarations error:", e?.response?.data || e);
      setAllDeclarations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeclarations();
  }, [fetchDeclarations]);

  const filtered = allDeclarations.filter((item) => {
    if (filter === "all") return true;
    const t = (item.declaration_type || item.type || "").toUpperCase();
    return filter === "perdu" ? t === "LOST" : t === "FOUND" || t === "TROUVE";
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const detailItem = detailId ? allDeclarations.find((d) => d.id === detailId) : null;

  const openDetail = (id: string) => setDetailId(id);
  const closeDetail = () => setDetailId(null);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const res = await declarationsService.delete(confirmDeleteId);
      if (res.success) {
        setAllDeclarations((prev) => prev.filter((d) => d.id !== confirmDeleteId));
        if (detailId === confirmDeleteId) setDetailId(null);
      } else {
        alert(res.message || "Erreur lors de la suppression");
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || "Erreur lors de la suppression";
      alert(msg);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title={t("mesdeclarations_title")} breadcrumbs={[{ label: t("mesdeclarations_breadcrumb_home"), href: "/dashboard" }, { label: t("mesdeclarations_title") }]} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-11 h-11 rounded-full border-4 border-borda border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("mesdeclarations_title")}
        breadcrumbs={[
          { label: t("mesdeclarations_breadcrumb_home"), href: "/dashboard" },
          { label: t("mesdeclarations_title") },
        ]}
      />

{/* REMPLACE la div enveloppante juste après le premier <Topbar /> */}
<div className="custom-scroll p-4 sm:p-6 flex flex-col gap-4 pb-28 md:pb-8 w-full max-w-7xl mx-auto max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        {/* Header card */}
        <section className="bg-white border border-borda rounded-[16px] sm:rounded-[18px] p-3 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-bricolage text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-800 truncate">{t("mesdeclarations_history_title")}</h1>
              <p className="text-[11px] sm:text-[12.5px] text-textMuted/70 mt-0.5 sm:mt-1 truncate">{t("mesdeclarations_history_subtitle")}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-1.5 sm:gap-2">
            {([
              { key: "all", label: t("mesdeclarations_filter_all") },
              { key: "perdu", label: t("mesdeclarations_filter_lost") },
              { key: "trouve", label: t("mesdeclarations_filter_found") },
            ] as { key: Filter; label: string }[]).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-[12px] font-semibold transition-all ${
                  filter === f.key
                    ? "bg-primary text-white border-primary"
                    : "bg-bgMain text-textMuted border-borda hover:border-primary hover:text-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const isPerdu = (item.declaration_type || item.type || "").toUpperCase() === "LOST";
            const typeBadge = isPerdu
              ? "bg-red-50 text-red-700 border-red-100"
              : "bg-green-50 text-green-700 border-green-100";
            const typeIcon = isPerdu ? "fa-triangle-exclamation" : "fa-file-circle-check";
            const typeLabel = isPerdu ? t("mesdeclarations_type_loss") : t("mesdeclarations_type_found");
            const statusMeta = getStatusMeta(t, item.status);

            return (
              <article
                key={item.id}
                onClick={() => openDetail(item.id)}
                className="bg-white border border-borda rounded-[18px] p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-bold text-textMuted/60 uppercase tracking-wide truncate">
                      {item.identifiant_doc_dm || t("mesdeclarations_default_ref")}
                    </p>
                    <h3 className="font-bricolage text-[16px] sm:text-[18px] font-bold text-gray-800 leading-tight mt-0.5 truncate">
                      {getDocTypeName(item)}
                    </h3>
                  </div>
                  <span className={`shrink-0 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full border text-[10px] sm:text-[11px] font-bold whitespace-nowrap ${typeBadge}`}>
                    <i className={`fa-solid ${typeIcon} mr-0.5 sm:mr-1`} />{typeLabel}
                  </span>
                </div>

                <div className="space-y-1 text-[12px] sm:text-[12.5px] text-textMuted">
                  <p className="truncate"><i className="fa-regular fa-user mr-1.5 w-4 shrink-0" /> <span className="truncate">{item.owner_name || item.nom_complet || t("mesdeclarations_unknown")}</span></p>
                  <p><i className="fa-regular fa-calendar mr-1.5 w-4 shrink-0" /> {fmtDate(item.created_at)}</p>
                  <p className="truncate"><i className="fa-solid fa-location-dot mr-1.5 w-4 shrink-0" /> <span className="truncate">{item.ville || item.lieu_perte || item.lieu_trouvee || "—"}</span></p>
                </div>

                <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2">
                  <span className={`px-2 sm:px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-semibold ${statusMeta.cls}`}>
                    {statusMeta.label}
                  </span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-[8px] sm:rounded-[9px] bg-surface2 border border-borda text-textMuted/50 hover:text-red-500 hover:border-red-200 transition-colors"
                      title={t("mesdeclarations_delete") || "Supprimer"}
                    >
                      <i className="fa-solid fa-trash-can text-[10px] sm:text-[11px]" />
                    </button>
                    <button className="px-2.5 sm:px-3 py-1.5 rounded-[8px] sm:rounded-[9px] bg-surface2 border border-borda text-[11px] sm:text-[12px] font-semibold text-textMuted/70 hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
                      {t("mesdeclarations_view_details")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Empty state */}
        {filtered.length === 0 && (
          <section className="bg-white border border-borda rounded-[18px] sm:rounded-[22px] p-6 sm:p-10 text-center shadow-sm">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-bgMain border border-borda flex items-center justify-center mb-3 sm:mb-4">
              <i className="fa-solid fa-folder-open text-textMuted text-xl sm:text-2xl" />
            </div>
            <p className="text-[15px] sm:text-[17px] font-bold text-textMain font-bricolage">{t("mesdeclarations_empty_title")}</p>
            <p className="text-[12px] sm:text-[13px] text-textMuted/70 mt-2 mb-5 sm:mb-6 max-w-[280px] mx-auto leading-relaxed">
              {t("mesdeclarations_empty_text")}
            </p>
            <button
              onClick={() => navigate("/declarer")}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <i className="fa-solid fa-plus" /> {t("mesdeclarations_create_declaration")}
            </button>
          </section>
        )}

        {/* Premium CTA banner */}
        <section className="mt-4 hidden sm:block xl:hidden bg-green-dark rounded-[18px] sm:rounded-[22px] p-5 sm:p-6 relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider">{t("mesdeclarations_premium")}</span>
            </div>
            <h3 className="font-bricolage text-base sm:text-lg font-bold mb-1">{t("mesdeclarations_premium_title")}</h3>
            <p className="text-white/60 text-[11.5px] sm:text-[12.5px] leading-relaxed mb-3 sm:mb-4">
              {t("mesdeclarations_premium_text")}
            </p>
            <button
              onClick={() => navigate("/abonnement")}
              className="inline-flex items-center gap-2 text-primary font-bold text-[12px] sm:text-[13px] hover:gap-3 transition-all"
            >
              {t("mesdeclarations_premium_cta")} <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
          <div className="absolute bottom-4 right-6 opacity-20 transform rotate-12 pointer-events-none">
            <i className="fa-solid fa-rocket text-4xl sm:text-6xl" />
          </div>
        </section>
      </div>

      {/* ────── Detail slide-in panel ────── */}
      {detailId && createPortal(
        <div
          className={`fixed inset-0 bg-green-dark/40 backdrop-blur-sm z-[210] transition-opacity duration-300 opacity-100`}
          onClick={closeDetail}
        >
          <div
            className={`absolute right-0 top-0 bottom-0 w-full max-w-[480px] bg-white shadow-2xl transition-transform duration-300 overflow-y-auto custom-scroll pb-0 ${
              detailId ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
          {detailItem && (
            <>
              {/* Panel Header */}
              <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-borda p-4 sm:p-5 flex items-center justify-between z-10">
                <h2 className="font-bricolage text-lg sm:text-xl font-bold text-textMain truncate">{t("mesdeclarations_detail_title")}</h2>
                <button
                  onClick={closeDetail}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-bgMain text-textMuted hover:text-red-500 transition-colors shrink-0"
                >
                  <i className="fa-solid fa-xmark text-sm sm:text-base" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Badge Type */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-bgMain border border-borda text-[11px] font-bold text-textMuted uppercase tracking-wider">
                    {detailItem.identifiant_doc_dm || "DOC-DM"}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full border text-[11px] font-bold ${
                      (detailItem.declaration_type || detailItem.type || "").toUpperCase() === "LOST"
                        ? "bg-red-50 text-red-700 border-red-100"
                        : "bg-green-50 text-green-700 border-green-100"
                    }`}
                  >
                    {(detailItem.declaration_type || detailItem.type || "").toUpperCase() === "LOST"
                      ? t("mesdeclarations_declaration_loss")
                      : t("mesdeclarations_declaration_found")}
                  </span>
                </div>

                {/* Main Info */}
                <div>
                  <h3 className="font-bricolage text-xl sm:text-2xl font-extrabold text-gray-800 break-words">
                    {getDocTypeName(detailItem)}
                  </h3>
                  <p className="text-textMuted/70 text-xs sm:text-sm mt-1">{t("mesdeclarations_published_on")} {fmtDate(detailItem.created_at)}</p>
                </div>

                {/* Status Card */}
                <div className={`p-3 sm:p-4 rounded-2xl border ${getStatusMeta(t, detailItem.status).cls} flex items-center justify-between gap-2`}>
                  <span className="text-xs sm:text-sm font-bold text-textMuted/80">{t("mesdeclarations_current_status")}</span>
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-white/50 border border-current text-[10px] sm:text-xs font-bold uppercase shrink-0">
                    {getStatusMeta(t, detailItem.status).label}
                  </span>
                </div>

                {/* Images */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <ImageBox
                    src={detailItem.photo_recto}
                    label={t("mesdeclarations_front")}
                    t={t}
                  />
                  <ImageBox
                    src={detailItem.photo_verso}
                    label={t("mesdeclarations_back")}
                    t={t}
                  />
                </div>

                {/* Details List */}
                <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-borda">
                  <DetailRow icon="fa-regular fa-user" label={t("mesdeclarations_owner")} value={detailItem.owner_name || detailItem.nom_complet || t("mesdeclarations_not_specified")} />
                  <DetailRow icon="fa-solid fa-hashtag" label={t("mesdeclarations_document_number")} value={detailItem.document_number || detailItem.numero_document || t("mesdeclarations_not_specified")} />
                  <DetailRow
                    icon="fa-solid fa-location-dot"
                    label={t("mesdeclarations_location")}
                    value={`${detailItem.ville || detailItem.lieu_perte || detailItem.lieu_trouvee || "—"}, ${detailItem.region || "—"} (${detailItem.pays || t("mesdeclarations_cameroon")})`}
                  />
                  <DetailRow
                    icon="fa-solid fa-stethoscope"
                    label={t("mesdeclarations_physical_state")}
                    value={
                      detailItem.etat_physique
                        ? detailItem.etat_physique === "bon"
                          ? t("mesdeclarations_good_condition")
                          : detailItem.etat_physique === "use"
                          ? t("mesdeclarations_used")
                          : t("mesdeclarations_damaged")
                        : t("mesdeclarations_not_precised")
                    }
                  />
                  {detailItem.date_expiration && (
                    <DetailRow icon="fa-solid fa-calendar-xmark" label={t("mesdeclarations_expiration_date")} value={fmtDate(detailItem.date_expiration)} />
                  )}
                </div>

                {/* Description */}
                <div className="pt-4 border-t border-borda">
                  <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-2">{t("mesdeclarations_description_notes")}</p>
                  <div className="p-4 bg-bgMain rounded-2xl text-sm text-textMain leading-relaxed italic whitespace-pre-wrap">
                    "{detailItem.description || t("mesdeclarations_no_description")}"
                  </div>
                </div>

                {/* Metadata */}
                {detailItem.metadata && Object.keys(detailItem.metadata).length > 0 && (
                  <div className="pt-4 border-t border-borda space-y-2">
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-2">Informations complémentaires</p>
                    {Object.entries(detailItem.metadata).map(([label, value]) => (
                      <DetailRow key={label} icon="fa-solid fa-tag" label={label} value={value || "—"} />
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 sm:pt-6 flex flex-col gap-2 sm:gap-3">
                  {detailItem.status === "MATCHED" && (
                    <button
                      onClick={() =>
                        navigate(
                          `/${(detailItem.declaration_type || detailItem.type || "").toUpperCase() === "LOST" ? "recuperer" : "rendre"}?id=${detailItem.id}`
                        )
                      }
                      className={`w-full py-3 sm:py-4 text-white rounded-xl font-black text-sm sm:text-base shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 sm:gap-3 ${
                        (detailItem.declaration_type || detailItem.type || "").toUpperCase() === "LOST"
                          ? "bg-green-600"
                          : "bg-blue-600"
                      }`}
                    >
                      <i className={`fa-solid ${(detailItem.declaration_type || detailItem.type || "").toUpperCase() === "LOST" ? "fa-handshake" : "fa-hand-holding-heart"}`} />
                      {(detailItem.declaration_type || detailItem.type || "").toUpperCase() === "LOST"
                        ? t("mesdeclarations_recover_document")
                        : t("mesdeclarations_return_document")}
                    </button>
                  )}

                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => navigate(`/partage?id=${detailItem.id}`)}
                      className="flex-1 py-2.5 sm:py-3 bg-green-dark text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-green-mid transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-green-dark/10"
                    >
                      <i className="fa-solid fa-share-nodes" /> {t("mesdeclarations_share")}
                    </button>
                    <button className="flex-1 py-2.5 sm:py-3 border border-borda text-textMuted rounded-xl font-bold text-xs sm:text-sm hover:bg-bgMain transition-colors">
                      <i className="fa-solid fa-flag mr-1" /> {t("mesdeclarations_report")}
                    </button>
                  </div>

                  <button
                    onClick={() => setConfirmDeleteId(detailItem.id)}
                    className="w-full py-2.5 sm:py-3 border border-red-200 text-red-500 rounded-xl font-bold text-xs sm:text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-trash-can" /> {t("mesdeclarations_delete") || "Supprimer"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>,
      document.body
      )}

      {/* ────── Delete confirmation modal ────── */}
      {confirmDeleteId && createPortal(
        <div
          className="fixed inset-0 bg-green-dark/60 backdrop-blur-md z-[210] flex items-center justify-center p-4"
          onClick={() => !deleting && setConfirmDeleteId(null)}
        >
          <div
            className="bg-white rounded-[28px] shadow-2xl max-w-[380px] w-full p-8 text-center animate-in slide-in-from-bottom-6 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <i className="fa-solid fa-trash-can text-red-500 text-2xl" />
            </div>
            <h2 className="font-bricolage text-xl font-black text-textMain mb-2">
              {t("mesdeclarations_delete_title") || "Supprimer la déclaration"}
            </h2>
            <p className="text-[13px] text-textMuted leading-relaxed mb-7">
              {t("mesdeclarations_delete_confirm") || "Cette action est irréversible. Voulez-vous vraiment supprimer cette déclaration ?"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="px-6 py-3.5 border-2 border-borderMain bg-white text-textMain rounded-2xl text-sm font-bold hover:bg-bgMain transition-all active:scale-95 disabled:opacity-50"
              >
                {t("mesdeclarations_cancel") || "Annuler"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-3.5 bg-red-500 text-white rounded-2xl font-bricolage font-black text-sm hover:bg-red-600 transition-all shadow-xl shadow-red-500/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <i className="fa-solid fa-trash-can" />
                )}
                {deleting
                  ? (t("mesdeclarations_deleting") || "Suppression...")
                  : (t("mesdeclarations_confirm_delete") || "Oui, supprimer")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ───── Sub-components ───── */

function ImageBox({ src, label, t }: { src?: string | null; label: string; t: (k: string) => string }) {
  const url = src
    ? src.startsWith("http") || src.startsWith("data:")
      ? src
      : window.location.origin + "/" + src.replace(/^\//, "")
    : null;

  return (
    <div className="aspect-[4/3] bg-bgMain rounded-2xl border border-borda overflow-hidden group relative">
      {url ? (
        <img
          src={url}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => window.open(url)}
          title={t("mesdeclarations_click_to_enlarge")}
          alt={label}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-textMuted opacity-50">
          <i className="fa-solid fa-image text-2xl mb-1" />
          <span className="text-[10px]">{t("mesdeclarations_image_absent")}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[9px] font-bold rounded uppercase pointer-events-none">
        {label}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-bgMain border border-borda flex items-center justify-center text-textMuted shrink-0">
        <i className={icon} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-textMain">{value}</p>
      </div>
    </div>
  );
}
