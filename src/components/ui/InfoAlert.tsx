import React from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../context/I18nContext";

interface InfoAlertProps {
  message: string;
  onClose: () => void;
}

export default function InfoAlert({ message, onClose }: InfoAlertProps) {
  const { t } = useI18n();

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 210 }}
    >
      <div className="bg-white rounded-[24px] shadow-2xl max-w-[360px] w-full p-8 text-center animate-in zoom-in-95 duration-200 modal-box">
        {/* Grab handle for mobile */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-5 md:hidden" />

        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-5">
          <i className="fa-solid fa-circle-info text-primary text-2xl"></i>
        </div>
        <p className="text-[14px] font-bold text-textMain leading-relaxed mb-6">
          {message}
        </p>
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary-dark transition-all active:scale-95"
        >
          {t("confirm_ok" as any) || "OK"}
        </button>
      </div>
    </div>,
    document.body
  );
}
