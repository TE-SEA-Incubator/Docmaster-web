import { useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../context/I18nContext";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPay: (method: "orange" | "mtn", phone: string) => Promise<void>;
  amount: number;
  title?: string;
  description?: string;
  termsText?: React.ReactNode;
  processing: boolean;
  error: string;
  children?: React.ReactNode;
  submitLabel?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onPay,
  amount,
  title,
  description,
  termsText,
  processing,
  error,
  children,
  submitLabel,
}: PaymentModalProps) {
  const { t } = useI18n();
  const [payMethod, setPayMethod] = useState<"orange" | "mtn" | "">("");
  const [payPhone, setPayPhone] = useState("");

  const OPERATORS = [
    {
      id: "orange" as const,
      label: t("payment_orange_money"),
      sublabel: t("payment_orange_sublabel"),
      bg: "bg-orange-500",
      border: "border-orange-500",
      selectedBg: "bg-orange-50",
      hoverBorder: "hover:border-orange-300",
    },
    {
      id: "mtn" as const,
      label: t("payment_mtn_money"),
      sublabel: t("payment_mtn_sublabel"),
      bg: "bg-yellow-500",
      border: "border-yellow-500",
      selectedBg: "bg-yellow-50",
      hoverBorder: "hover:border-yellow-300",
    },
  ];

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!payMethod || !payPhone.trim()) return;
    await onPay(payMethod, payPhone);
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={() => { if (!processing) onClose(); }}
      style={{ zIndex: 210 }}
    >
      <div
        className="bg-white rounded-[24px] shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-300 modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle for mobile */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-5 md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bricolage text-lg font-black text-textMain">{title || t("payment_title")}</h2>
          <button
            onClick={onClose}
            disabled={processing}
            className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center text-textMuted hover:text-textMain transition-colors disabled:opacity-50"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {description && (
          <p className="text-[12px] text-textMuted mb-4 leading-relaxed">{description}</p>
        )}

        {children}

        {/* Amount */}
        <div className="p-4 bg-bgMain rounded-[16px] mb-5">
          <p className="text-[10px] font-bold text-textMuted uppercase mb-1">{t("payment_amount")}</p>
          <p className="font-bricolage text-2xl font-black text-primary">
            {amount > 0 ? `${amount.toLocaleString("fr-FR")} FCFA` : "—"}
          </p>
        </div>

        {/* Operator selection */}
        <p className="text-[12px] font-bold text-textMain mb-3">{t("payment_choose_method")}</p>
        <div className="space-y-2.5 mb-5">
          {OPERATORS.map((op) => (
            <div
              key={op.id}
              className={`p-3 border-2 rounded-[14px] cursor-pointer transition-all ${
                payMethod === op.id
                  ? `${op.border} ${op.selectedBg}`
                  : `border-borda ${op.hoverBorder}`
              }`}
              onClick={() => setPayMethod(op.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-[10px] ${op.bg} flex items-center justify-center`}>
                  <span className="text-white font-bricolage font-black text-lg">{op.id === "orange" ? "O" : "M"}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-textMain">{op.label}</p>
                  <p className="text-[11px] text-textMuted">{op.sublabel}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    payMethod === op.id ? `${op.bg} ${op.border}` : "border-borda"
                  }`}
                >
                  {payMethod === op.id && <i className="fa-solid fa-check text-white text-[10px]" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Phone input */}
        {payMethod && (
          <div className="mb-5">
            <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-1.5 block">
              {t("payment_phone_label")}
            </label>
            <input
              type="tel"
              value={payPhone}
              onChange={(e) => setPayPhone(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              placeholder={t("payment_phone_placeholder")}
            />
            <p className="text-[11px] text-textMuted mt-1.5">
              <i className="fa-solid fa-info-circle text-[10px]" />
              {" "}{payMethod === "orange" ? t("payment_phone_hint_orange") : t("payment_phone_hint_mtn")}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-[12px] text-[12px] text-red-600 font-semibold mb-4 flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!payMethod || !payPhone.trim() || processing}
          className="w-full py-3 bg-primary text-white rounded-xl font-bricolage text-[14px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark transition-all active:scale-[.98]"
        >
          {processing ? (
            <><i className="fa-solid fa-spinner fa-spin mr-1" /> {t("payment_processing")}</>
          ) : (
            submitLabel || `${t("payment_pay")} ${amount > 0 ? amount.toLocaleString("fr-FR") : ""} FCFA`
          )}
        </button>

        {termsText && (
          <p className="text-[10px] text-textMuted text-center mt-4 leading-relaxed">{termsText}</p>
        )}
      </div>
    </div>,
    document.body
  );
}
