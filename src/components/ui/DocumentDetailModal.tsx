import { createPortal } from "react-dom";
import { useI18n } from "../../context/I18nContext";
import type { Document } from "../../types/api";
import { generateDocumentPDF } from "../../utils/pdf";
import { subscriptionsService } from "../../services/subscriptionsService";
import DocumentViewer from "./DocumentViewer";

interface DocumentDetailModalProps {
  doc: Document;
  catLabels: Record<string, string>;
  onClose: () => void;
  onShare?: () => void;
  onEdit?: () => void;
}

export default function DocumentDetailModal({
  doc,
  catLabels,
  onClose,
  onShare,
  onEdit,
}: DocumentDetailModalProps) {
  const { t } = useI18n();
  const isPermanent = doc.validity_option === 'PERMANENT';
  const isExpired = !isPermanent && doc.date_expiration && new Date(doc.date_expiration) < new Date();

  const handleDownload = async () => {
    try {
      const subRes = await subscriptionsService.getMySubscription();
      const isFree = !subRes?.data || subRes.data.plan_id === "free";
      await generateDocumentPDF({
        type_doc: doc.type_doc || "",
        numero_doc: doc.numero_doc,
        nom_sur_doc: doc.nom_sur_doc,
        date_delivrance: doc.date_delivrance,
        date_expiration: doc.date_expiration,
        nom_autorite: doc.nom_autorite,
        photo_recto: doc.photo_recto,
        photo_verso: doc.photo_verso,
      }, isFree);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const badgePosition = "absolute right-4 bottom-4 md:top-4 md:bottom-auto md:right-4";

  return createPortal(
    <>
      {/* Overlay - desktop only */}
      <div
        className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-sm z-[210]"
        onClick={onClose}
      />

      {/* Modal Container - Mobile as full page, Desktop as modal */}
      <div className="fixed inset-0 z-[211] flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="w-full md:max-w-6xl md:rounded-3xl md:shadow-2xl bg-white flex flex-col md:flex-row h-full md:h-auto max-h-screen md:max-h-[90vh] overflow-hidden pb-0">
          {/* Left: Image Viewer - Mobile/Tablet Full Width First */}
          <div className="relative w-full md:w-3/5 h-[45vh] md:h-auto overflow-hidden">
            <DocumentViewer recto={doc.photo_recto} verso={doc.photo_verso} title={doc.nom_sur_doc || undefined} />

            {/* Close Button - Mobile Only */}
            <button
              onClick={onClose}
              aria-label={t("detail_close")}
              className="md:hidden absolute top-4 right-4 w-11 h-11 bg-white/90 rounded-xl flex items-center justify-center text-slate-900 hover:bg-white transition-colors z-10 shadow-lg"
            >
              <i className="ph ph-x text-lg" />
            </button>

            {/* Validity Badge */}
            {isPermanent && (
              <div className={`${badgePosition} flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full backdrop-blur`}>
                <i className="ph ph-infinity text-[10px] md:text-xs text-white" />
                <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">
                  {t("detail_permanent")}
                </span>
              </div>
            )}
            {isExpired && (
              <div className={`${badgePosition} flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full backdrop-blur`}>
                <i className="ph ph-clock text-[10px] md:text-xs text-white" />
                <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">
                  {t("detail_expired")}
                </span>
              </div>
            )}
            {!isPermanent && !isExpired && doc.validity_option === 'EXPIRING' && (
              <div className={`${badgePosition} flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full backdrop-blur`}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-light" />
                <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">
                  {t("detail_securise")}
                </span>
              </div>
            )}
          </div>

          {/* Right: Details Panel - Scrollable */}
          <div className="flex-1 flex flex-col h-auto md:h-full bg-white overflow-hidden">
            {/* Header */}
            <div className="px-4 md:px-8 pt-6 md:pt-8 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">
                      {catLabels[doc.type_doc ?? ""] || "Document"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {doc.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-200">
                          <i className="ph ph-shield-check" /> {t("detail_certifie")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider border border-amber-200">
                          <i className="ph ph-hourglass" /> {t("detail_valide")}
                        </span>
                      )}
                    </div>
                  </div>
                  <h2 className="font-bricolage text-2xl md:text-3xl font-black text-slate-900 truncate">
                    {doc.nom_sur_doc || t("detail_no_title")}
                  </h2>
                </div>

                {/* Close Button - Desktop Only */}
                <button
                  onClick={onClose}
                  className="hidden md:flex w-10 h-10 rounded-xl border border-slate-200 text-slate-400 items-center justify-center hover:bg-slate-50 hover:text-slate-600 transition-all flex-shrink-0"
                >
                  <i className="ph ph-x text-lg" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
              {/* Key Information */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: t("detail_numero"),
                    value: doc.numero_doc || "—",
                    icon: "ph ph-barcode",
                  },
                  {
                    label: t("detail_type"),
                    value: catLabels[doc.type_doc ?? ""] || "—",
                    icon: "ph ph-file",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all"
                  >
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <i className={`${item.icon} text-[11px]`} />
                      {item.label}
                    </p>
                    <p className="text-sm md:text-base font-bold text-slate-900 truncate">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: t("detail_delivrance"),
                    value: doc.date_delivrance
                      ? new Date(doc.date_delivrance).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—",
                    icon: "ph ph-calendar-check",
                  },
                  {
                    label: t("detail_expiration"),
                    value: isPermanent
                      ? t("detail_no_expiry")
                      : doc.date_expiration
                        ? new Date(doc.date_expiration).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—",
                    icon: "ph ph-calendar-x",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all"
                  >
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <i className={`${item.icon} text-[11px]`} />
                      {item.label}
                    </p>
                    <p className="text-sm md:text-base font-bold text-slate-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Owner & Authority */}
              <div className="space-y-3">
                {[
                  {
                    label: t("detail_proprietaire"),
                    value: doc.nom_sur_doc || "—",
                    icon: "ph ph-user-check",
                    color: "blue",
                  },
                  {
                    label: t("detail_autorite"),
                    value: doc.nom_autorite || "—",
                    icon: "ph ph-building",
                    color: "slate",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          item.color === "blue"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <i className={`${item.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                          {item.label}
                        </p>
                        <p className="text-sm md:text-base font-bold text-slate-900 break-words">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes Section */}
              {doc.notes && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                    <i className="ph ph-note mr-1.5" />
                    {t("detail_notes")}
                  </p>
                  <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-xl">
                    <p className="text-sm text-amber-900 leading-relaxed font-medium">
                      {doc.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="text-[11px] text-slate-500 space-y-1 pt-4 border-t border-slate-100">
                <p>
                  <span className="font-semibold">{t("detail_id")}:</span> {doc.id?.substring(0, 8)}...
                </p>
                <p>
                  <span className="font-semibold">{t("detail_added_on")}:</span>{" "}
                  {doc.created_at
                    ? new Date(doc.created_at).toLocaleDateString("fr-FR")
                    : "—"}
                </p>
              </div>

              {/* Action Buttons - scroll with content on mobile */}
              <div className="pt-6 flex flex-col gap-2">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="w-full h-11 bg-white border border-borderMain text-textMain rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface2 transition-colors active:scale-[0.98]"
                  >
                    <i className="ph ph-pen" /> {t("detail_edit")}
                  </button>
                )}

                <button onClick={handleDownload} className="w-full h-11 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors active:scale-[0.98]" style={{ background: "#1E3A2F" }}>
                  <i className="ph ph-download" /> {t("detail_telecharger")}
                </button>

                <button
                  onClick={() => { onClose(); onShare?.(); }}
                  className="w-full h-11 bg-white border border-borderMain text-textMain rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface2 transition-colors active:scale-[0.98]"
                >
                  <i className="ph ph-share-network" /> {t("detail_partager")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>,
    document.body
  );
}