import { useState } from "react";
import { createPortal } from "react-dom";
import { documentsService } from "../../services/documentsService";
import type { Document } from "../../types/api";
import { useI18n } from "../../context/I18nContext";

interface ShareModalProps {
  doc: Document;
  onClose: () => void;
}

export default function ShareModal({ doc, onClose }: ShareModalProps) {
  const { t } = useI18n();
  const [duration, setDuration] = useState("7");
  const [generating, setGenerating] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [error, setError] = useState("");

  const generateLink = async () => {
    setGenerating(true);
    setError("");
    try {
      const days = parseInt(duration);
      const res = await documentsService.createShare(doc.id, isNaN(days) ? undefined : days);
      setShareLink(res.data?.shareUrl || "");
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la génération du lien");
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    if (shareLink) navigator.clipboard.writeText(shareLink);
  };

  const durationOptions = [
    { value: "1", label: t("share_expire_24h") || "24 heures" },
    { value: "7", label: t("share_expire_7d") || "7 jours" },
    { value: "30", label: t("share_expire_30d") || "30 jours" },
    { value: "0", label: t("share_permanent") || "Permanent" },
  ];

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 210 }}>
      <div className="modal-box max-w-lg w-[90%] overflow-hidden border border-slate-200 shadow-2xl bg-white animate-in">
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 md:hidden" />
        <div className="p-8 md:p-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 shadow-sm">
                <i className="fa-solid fa-paper-plane" />
              </div>
              <div>
                <h3 className="font-bricolage text-2xl font-extrabold text-slate-900 leading-tight">{t("share_secure_heading")}</h3>
                <p className="text-[12px] text-slate-500 font-medium">{t("share_secure_subtitle")}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
              <i className="fa-solid fa-file-shield text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t("share_file_selected")}</p>
              <p className="text-[14px] font-extrabold text-slate-900">{doc.nom_sur_doc || "Document"}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">{t("share_validity")}</label>
              <div className="relative">
                <select value={duration} onChange={(e) => { setDuration(e.target.value); setShareLink(""); }}
                  className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl font-poppins text-[14px] text-slate-700 outline-none focus:border-primary transition-all appearance-none cursor-pointer">
                  {durationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700 font-medium">
                <i className="fa-solid fa-circle-exclamation mr-2" />{error}
              </div>
            )}

            {shareLink ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <i className="fa-solid fa-check-circle text-green-600 flex-shrink-0" />
                  <span className="text-[13px] text-green-800 font-medium flex-1 truncate">{shareLink}</span>
                  <button onClick={copyLink}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[11px] font-bold hover:bg-green-700 transition-all flex-shrink-0">
                    {t("share_copy")}
                  </button>
                </div>
                <button onClick={() => setShareLink("")}
                  className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-[13px] hover:bg-slate-50 transition-all">
                  {t("share_generate_new")}
                </button>
              </div>
            ) : (
              <button onClick={generateLink} disabled={generating}
                className="w-full h-14 bg-green-dark text-white rounded-[18px] font-bold text-[14px] uppercase tracking-wider hover:bg-green-mid transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50">
                {generating ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-link" />}
                {generating ? t("share_generating") : t("share_generate")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}