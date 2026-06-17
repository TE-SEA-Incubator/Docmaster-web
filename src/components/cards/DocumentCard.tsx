import { useI18n } from "../../context/I18nContext";
import type { Document } from "../../types/api";

interface DocumentCardProps {
  doc: Document;
  catLabels: Record<string, string>;
  onView: (doc: Document) => void;
  onShare: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onReportLost: (doc: Document) => void;
}

export default function DocumentCard({ doc, catLabels, onView, onShare, onDelete, onReportLost }: DocumentCardProps) {
  const { t } = useI18n();
  const getPhotoUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${window.location.origin}/${url.replace(/^\//, "")}`;
  };

  const isExpired = doc.date_expiration && doc.validity_option === 'EXPIRING' && new Date(doc.date_expiration) < new Date();

  return (
    <div className={`doc-card ${doc.is_lost ? "is-lost" : ""} ${doc.is_archived ? "opacity-60" : ""}`}>
      <div className="card-thumb relative cursor-pointer" onClick={() => onView(doc)}>
        {doc.photo_recto ? (
          <img src={getPhotoUrl(doc.photo_recto)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <i className="fa-regular fa-file text-3xl text-slate-300" />
          </div>
        )}
        {doc.is_archived && (
          <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-white text-[9px] font-bold">
            <i className="fa-solid fa-box-archive text-[7px]" /> {t("doccard_archived")}
          </span>
        )}
        {doc.is_lost && (
          <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-bold">
            <i className="fa-solid fa-triangle-exclamation text-[7px]" /> {t("doccard_lost")}
          </span>
        )}
        {doc.is_verified && (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold">
            <i className="fa-solid fa-check text-[7px]" /> {t("doccard_verified")}
          </span>
        )}
        {doc.validity_option === 'PERMANENT' && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
            <i className="fa-solid fa-infinity text-[7px]" /> {t("doccard_permanent")}
          </span>
        )}
        {isExpired && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[9px] font-bold">
            <i className="fa-solid fa-clock text-[7px]" /> {t("doccard_expired")}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-textMain truncate">{doc.nom_sur_doc || t("doccard_no_name")}</p>
            <p className="text-[11px] text-textMuted truncate">{catLabels[doc.type_doc ?? ""] || doc.type_doc} — N° {doc.numero_doc || "---"}</p>
          </div>
          <div className="relative group/ml">
            <button className="text-primary text-sm hover:bg-primary/10 p-1.5 rounded-lg transition-colors flex-shrink-0">
              <i className="fa-solid fa-ellipsis-vertical" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-borda rounded-xl shadow-lg py-1 min-w-[160px] hidden group-hover/ml:block z-20">
              <button onClick={() => onView(doc)} className="w-full text-left px-3 py-2 text-[12px] font-medium text-textMain hover:bg-bgMain flex items-center gap-2">
                <i className="fa-solid fa-eye text-primary text-[10px]" /> {t("doccard_view")}
              </button>
              <button onClick={() => onShare(doc)} className="w-full text-left px-3 py-2 text-[12px] font-medium text-textMain hover:bg-bgMain flex items-center gap-2">
                <i className="fa-solid fa-share-nodes text-primary text-[10px]" /> {t("doccard_share")}
              </button>
              {!doc.is_lost && (
                <button onClick={() => onReportLost(doc)} className="w-full text-left px-3 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-[10px]" /> {t("doccard_report_lost")}
                </button>
              )}
              <button onClick={() => onDelete(doc)} className="w-full text-left px-3 py-2 text-[12px] font-medium text-textMuted hover:bg-bgMain flex items-center gap-2">
                <i className="fa-solid fa-trash text-[10px]" /> {t("doccard_delete")}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-borda">
          <span className="text-[10px] text-textMuted">
            <i className="fa-regular fa-calendar mr-1" />
            {new Date(doc.created_at).toLocaleDateString("fr-FR")}
          </span>
          {!doc.is_lost && (
            <button onClick={() => onReportLost(doc)} className="text-[9px] font-bold text-red-500 hover:text-red-700 transition-colors">
              <i className="fa-solid fa-flag mr-0.5" /> {t("doccard_lost_question")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
