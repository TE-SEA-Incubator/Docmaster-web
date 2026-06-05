import { useState } from "react";
import type { Document } from "../../types/api";
import { useI18n } from "../../context/I18nContext";

interface ShareModalProps {
  doc: Document;
  onClose: () => void;
}

export default function ShareModal({ doc, onClose }: ShareModalProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<"link" | "email">("link");

  const shareLink = `${window.location.origin}/documents/${doc.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareMethods = [
    {
      id: "email",
      label: t("share_email"),
      icon: "fa-envelope",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "whatsapp",
      label: t("share_whatsapp"),
      icon: "fa-whatsapp",
      color: "from-green-500 to-green-600",
    },
    {
      id: "link",
      label: t("share_copy_link"),
      icon: "fa-link",
      color: "from-slate-600 to-slate-700",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 md:p-0">
        <div className="w-full md:max-w-md bg-white rounded-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 md:zoom-in-95 pb-[70px] md:pb-0">
          {/* Header */}
          <div className="px-6 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bricolage text-2xl font-black text-slate-900">
                {t("share_title")}
              </h3>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              {doc.nom_sur_doc || "Document"}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Quick Share Methods */}
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                {t("share_quick")}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {shareMethods.map((method) => (
                  <button
                    key={method.id}
                    className={`py-4 rounded-2xl font-bold text-white transition-all active:scale-95 flex flex-col items-center gap-2 ${
                      method.id === "link"
                        ? "bg-gradient-to-br from-slate-600 to-slate-700"
                        : `bg-gradient-to-br ${method.color}`
                    }`}
                  >
                    <i className={`fa-brands ${method.icon} text-xl`} />
                    <span className="text-xs font-bold">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Link Share */}
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                {t("share_link_heading")}
              </p>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                  {shareLink}
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <i className="fa-solid fa-check mr-2" /> {t("share_copied")}
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-copy mr-2" /> {t("share_copy")}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3 p-4 bg-blue-50 rounded-2xl border border-blue-200">
              <p className="text-xs font-black text-blue-700 uppercase tracking-widest">
                <i className="fa-solid fa-shield-check mr-1.5" />
                {t("share_secure_heading")}
              </p>
              <div className="space-y-2">
                {[
                  { label: t("share_perm_read_only"), checked: true },
                  { label: t("share_perm_download"), checked: true },
                  { label: t("share_perm_share"), checked: false },
                ].map((perm, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={perm.checked}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-blue-900 font-medium">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                {t("share_expiration")}
              </p>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-primary focus:outline-none">
                <option value="7">{t("share_7days")}</option>
                <option value="30">{t("share_30days")}</option>
                <option value="90">{t("share_90days")}</option>
                <option value="never">{t("share_never_expire")}</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-12 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-50 transition-all"
            >
              {t("share_cancel")}
            </button>
            <button className="flex-1 h-12 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:from-slate-800 hover:to-slate-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <i className="fa-solid fa-check" /> {t("share_confirm")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}