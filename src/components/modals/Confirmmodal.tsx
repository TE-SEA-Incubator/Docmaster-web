import { useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../context/I18nContext";

interface ConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
  password: string;
  onPasswordChange: (pwd: string) => void;
  passwordError: boolean;
}

export default function ConfirmModal({
  onClose,
  onConfirm,
  password,
  onPasswordChange,
  passwordError,
}: ConfirmModalProps) {
  const { t } = useI18n();

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 210 }}
    >
      <div className="bg-white rounded-[28px] shadow-2xl max-w-[420px] w-full p-10 text-center animate-in slide-in-from-bottom-6 duration-300 modal-box">
        {/* Grab handle for mobile */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-5 md:hidden" />

        {/* Warning Icon */}
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
          <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl"></i>
        </div>

        {/* Title */}
        <h2 className="font-bricolage text-2xl font-black text-textMain mb-2 leading-tight">
          {t("confirm_declaration_title")}
        </h2>

        {/* Description */}
        <p className="text-[13.5px] text-textMuted leading-relaxed mb-6 px-2">
          {t("confirm_declaration_desc")}
        </p>

        {/* Cost Warning */}
        <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 mb-8 text-left relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-400"></div>
          <p className="text-[11.5px] text-orange-900 leading-relaxed font-bold">
            <i className="fa-solid fa-circle-info text-orange-500 mr-2 text-sm"></i>
            {t("confirm_important_note")}
          </p>
          <p className="text-[11.5px] text-orange-800/80 leading-relaxed mt-1 font-medium">
            {t("confirm_recovery_fee_desc")}
          </p>
        </div>

        {/* Password Field */}
        <div className="mb-8">
          <div className="relative group">
            <i className="fa-solid fa-lock text-primary absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:scale-110 transition-transform"></i>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={t("confirm_password_placeholder")}
              className={`w-full pl-12 pr-4 py-4 bg-bgMain border-2 rounded-2xl text-textMain text-sm outline-none transition-all font-bold tracking-widest ${
                passwordError 
                  ? "border-red-500 bg-red-50" 
                  : "border-borderMain focus:border-primary focus:bg-white focus:shadow-lg focus:shadow-primary/5"
              }`}
            />
          </div>
          {passwordError && (
            <p className="text-[11px] text-red-500 mt-2 font-bold animate-bounce">
              <i className="fa-solid fa-xmark-circle mr-1"></i>
              {t("confirm_password_error")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onClose}
            className="px-6 py-4 border-2 border-borderMain bg-white text-textMain rounded-2xl text-sm font-bold hover:bg-bgMain transition-all active:scale-95"
          >
            {t("confirm_cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-4 bg-red-500 text-white rounded-2xl font-bricolage font-black text-sm hover:bg-red-600 transition-all shadow-xl shadow-red-500/30 active:scale-95"
          >
            {t("confirm_confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
