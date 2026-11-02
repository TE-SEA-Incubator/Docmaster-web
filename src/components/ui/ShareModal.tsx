import { useState } from "react";
import type { Document } from "../../types/api";
import { useI18n } from "../../context/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "./dialog";

interface ShareModalProps {
  doc: Document;
  onClose: () => void;
}

export default function ShareModal({ doc, onClose }: ShareModalProps) {
  const { t } = useI18n();
  const [duration, setDuration] = useState("7");
  const [generating, setGenerating] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const generateLink = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    setShareLink(`${window.location.origin}/recuperer?id=${doc.id}&d=${duration}`);
    setGenerating(false);
  };

  const copyLink = () => {
    if (shareLink) navigator.clipboard.writeText(shareLink);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <i className="ph ph-paper-plane text-slate-600" />
              <div>
                <h3 className="font-bricolage text-lg font-extrabold text-slate-900 leading-tight">{t("share_secure_heading")}</h3>
                <p className="text-[12px] text-slate-500 font-medium">{t("share_secure_subtitle")}</p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
              <i className="ph ph-file-lock text-slate-600" />
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
                  <option value="1">{t("share_expire_24h")}</option>
                  <option value="7">{t("share_expire_7d")}</option>
                  <option value="30">{t("share_expire_30d")}</option>
                  <option value="0">{t("share_permanent")}</option>
                </select>
                <i className="ph ph-caret-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>

            {shareLink ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <i className="ph ph-check-circle text-green-600" />
                  <span className="text-[13px] text-green-800 font-medium flex-1 truncate">{shareLink}</span>
                  <button onClick={copyLink}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[11px] font-bold hover:bg-green-700 transition-all">
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
                {generating ? <i className="ph ph-spinner animate-spin" /> : <i className="ph ph-link" />}
                {generating ? t("share_generating") : t("share_generate")}
              </button>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
