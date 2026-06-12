import { createPortal } from "react-dom";
import { useI18n } from "../../context/I18nContext";

interface SuccessModalProps {
  refNumber: string;
  onClose: () => void;
  onNewDeclaration: () => void;
  onMyDeclarations: () => void;
}

export default function SuccessModal({
  refNumber,
  onClose,
  onNewDeclaration,
  onMyDeclarations,
}: SuccessModalProps) {
  const { t } = useI18n();

  const handleDownloadPdf = () => {
    // À implémenter selon votre logique de génération PDF
    console.log("Téléchargement PDF...");
  };

  return createPortal(
    <div
      className="modal-overlay"
      style={{ zIndex: 210 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full p-10 text-center animate-in zoom-in duration-300 modal-box">
        {/* Grab handle for mobile */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-5 md:hidden" />

        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <i className="fa-solid fa-check text-green-dark text-4xl"></i>
        </div>

        {/* Title */}
        <h2 className="font-bricolage text-2xl font-black text-textMain mb-2 leading-tight">
          {t("success_declaration_title")}
        </h2>

        {/* Description */}
        <p className="text-[13px] text-textMuted leading-relaxed mb-6 px-4">
          {t("success_declaration_desc")}
        </p>

        {/* Reference Badge */}
        <div className="inline-block px-6 py-2.5 bg-bgMain border-2 border-borderMain rounded-xl mb-3 shadow-sm">
          <p className="text-lg font-bricolage font-black text-green-dark tracking-[0.1em]">
            {refNumber}
          </p>
        </div>
        <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-8 opacity-70">
          {t("success_keep_reference")}
        </p>

        {/* Download PDF Button */}
        <button
          onClick={handleDownloadPdf}
          className="w-full mb-4 px-6 py-3.5 bg-primary text-white rounded-2xl font-bricolage font-black text-sm hover:bg-primary-dark transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-3 group"
        >
          <i className="fa-solid fa-file-arrow-down group-hover:translate-y-0.5 transition-transform"></i>
          {t("success_download_pdf")}
        </button>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onNewDeclaration}
            className="px-4 py-3 bg-white border-2 border-borderMain text-textMain rounded-xl text-xs font-bold hover:bg-bgMain transition-all"
          >
            {t("success_new_declaration")}
          </button>
          <button
            onClick={onMyDeclarations}
            className="px-4 py-3 bg-green-dark text-white rounded-xl text-xs font-bold hover:bg-green-mid transition-all shadow-lg shadow-green-dark/10"
          >
            {t("success_my_declarations")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}