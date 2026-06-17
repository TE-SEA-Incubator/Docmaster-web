import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../context/I18nContext";
import { paymentsService, type SavedPaymentMethod } from "../../services/paymentsService";
import { validatePhone, formatPhone } from "../../utils/phoneValidation";
import api from "../../services/api";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPay: (method: "orange" | "mtn" | "points", phone: string) => Promise<void>;
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
  const [payMethod, setPayMethod] = useState<"orange" | "mtn" | "points" | "">("");
  const [payPhone, setPayPhone] = useState("");
  const [pointsNeeded, setPointsNeeded] = useState<number | null>(null);
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [useSaved, setUseSaved] = useState(false);
  const [selectedSaved, setSelectedSaved] = useState<SavedPaymentMethod | null>(null);
  const [phoneErr, setPhoneErr] = useState("");

  useEffect(() => {
    if (amount > 0) {
      api.get('/points/rate').then((res: any) => {
        const rate = res.data.rate || 10;
        setPointsNeeded(Math.ceil(amount * rate));
      });
    }
  }, [amount]);

  useEffect(() => {
    paymentsService.getPaymentMethods()
      .then((res) => { if (res.success && res.data) setSavedMethods(res.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedSaved(null);
    setPayPhone("");
    setPhoneErr("");
  }, [payMethod, useSaved]);

  const savedForMethod = savedMethods.filter((m) => {
    if (payMethod === "mtn") return m.method_type === "MTN";
    if (payMethod === "orange") return m.method_type === "ORANGE";
    return false;
  });

  const METHODS = {
    MOBILE: [
      {
        id: "orange" as const,
        label: t("payment_orange_money"),
        sublabel: t("payment_orange_sublabel"),
        bg: "bg-orange-500",
        border: "border-orange-500",
      },
      {
        id: "mtn" as const,
        label: t("payment_mtn_money"),
        sublabel: t("payment_mtn_sublabel"),
        bg: "bg-yellow-500",
        border: "border-yellow-500",
      },
    ],
    POINTS: {
        id: "points" as const,
        label: "Payer avec mes Points",
        sublabel: pointsNeeded ? `Coût: ${pointsNeeded} pts` : "Chargement...",
        bg: "bg-green-500",
        border: "border-green-500",
    },
    PAYPOINT: {
        id: "paypoint" as const,
        label: "PayPoint",
        sublabel: "Bientôt disponible",
        bg: "bg-gray-400",
        border: "border-gray-400",
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!payMethod || payMethod === 'paypoint') return;

    if (payMethod === 'points') {
      await onPay(payMethod, "");
      return;
    }

    let phone = "";
    if (useSaved && selectedSaved) {
      phone = selectedSaved.account_number;
    } else {
      phone = payPhone;
    }

    if (!phone.trim()) return;

    const operator = payMethod === "mtn" ? "MTN" : "ORANGE";
    const vErr = validatePhone(phone.trim(), operator);
    if (vErr) {
      setPhoneErr(vErr);
      return;
    }

    setPhoneErr("");
    await onPay(payMethod, phone);
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

        {/* Payment Methods */}
        <p className="text-[12px] font-bold text-textMain mb-3">{t("payment_choose_method")}</p>
        <div className="space-y-4 mb-5">
            {/* Mobile Money Group */}
            <div className="space-y-2.5">
                <p className="text-[10px] uppercase font-bold text-textMuted">Mobile Money</p>
                {METHODS.MOBILE.map((op) => (
                    <div key={op.id} className={`p-3 border-2 rounded-[14px] cursor-pointer transition-all ${payMethod === op.id ? `${op.border} bg-white` : 'border-borda'}`} onClick={() => setPayMethod(op.id)}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-[10px] ${op.bg} flex items-center justify-center`}>
                                <span className="text-white font-bricolage font-black text-lg">{op.id === "orange" ? "O" : "M"}</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] font-bold text-textMain">{op.label}</p>
                                <p className="text-[11px] text-textMuted">{op.sublabel}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Points & PayPoint */}
            <div className="space-y-2.5">
                <p className="text-[10px] uppercase font-bold text-textMuted">Autres</p>
                {/* Points */}
                <div className={`p-3 border-2 rounded-[14px] cursor-pointer transition-all ${payMethod === 'points' ? `${METHODS.POINTS.border} bg-green-50` : 'border-borda'}`} onClick={() => setPayMethod('points')}>
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-[10px] ${METHODS.POINTS.bg} flex items-center justify-center`}>
                            <i className="fa-solid fa-star text-white"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[13px] font-bold text-textMain">{METHODS.POINTS.label}</p>
                            <p className="text-[11px] text-textMuted">{METHODS.POINTS.sublabel}</p>
                        </div>
                     </div>
                </div>
                {/* PayPoint (Disabled) */}
                <div className="p-3 border-2 rounded-[14px] border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] bg-gray-400 flex items-center justify-center">
                            <i className="fa-solid fa-credit-card text-white"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[13px] font-bold text-gray-500">PayPoint</p>
                            <p className="text-[11px] text-gray-400">Bientôt disponible</p>
                        </div>
                     </div>
                </div>
            </div>
        </div>

        {/* Phone input (only for mobile money methods) */}
        {payMethod && payMethod !== 'points' && (
          <div className="mb-5">
            {savedForMethod.length > 0 && (
              <div className="mb-3">
                <div className="flex gap-2 bg-gray-50 rounded-[10px] p-1 mb-3">
                  <button
                    onClick={() => { setUseSaved(false); setSelectedSaved(null); }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-[8px] transition-all ${!useSaved ? "bg-white shadow-sm text-textMain" : "text-textMuted"}`}
                  >
                    {t("payment_enter_manual")}
                  </button>
                  <button
                    onClick={() => { setUseSaved(true); }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-[8px] transition-all ${useSaved ? "bg-white shadow-sm text-textMain" : "text-textMuted"}`}
                  >
                    {t("payment_use_saved")}
                  </button>
                </div>

                {useSaved && (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scroll mb-3">
                    {savedForMethod.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedSaved(m)}
                        className={`flex items-center gap-2.5 p-2.5 border-2 rounded-[10px] cursor-pointer transition-all ${
                          selectedSaved?.id === m.id ? "border-primary bg-primary/5" : "border-borda"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                          style={{ background: payMethod === "mtn" ? "#FEF3C7" : "#FFF7ED" }}>
                          <i className={`fa-solid fa-mobile-screen-button text-[10px] ${payMethod === "mtn" ? "text-yellow-500" : "text-orange-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-textMain truncate">{m.account_number}</p>
                          {m.account_name && <p className="text-[10px] text-textMuted truncate">{m.account_name}</p>}
                        </div>
                        {selectedSaved?.id === m.id && <i className="fa-solid fa-circle-check text-primary text-xs" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!useSaved && (
              <>
                <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-1.5 block">
                  {t("payment_phone_label")}
                </label>
                <input
                  type="tel"
                  value={payPhone}
                  onChange={(e) => { setPayPhone(e.target.value); setPhoneErr(""); }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder={t("payment_phone_placeholder")}
                />
                {payMethod === "mtn" && <p className="text-[10px] text-textMuted mt-1">{t("payment_phone_mtn_hint")}</p>}
                {payMethod === "orange" && <p className="text-[10px] text-textMuted mt-1">{t("payment_phone_orange_hint")}</p>}
              </>
            )}

            {phoneErr && (
              <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                <i className="fa-solid fa-circle-exclamation" /> {phoneErr}
              </p>
            )}
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
          disabled={
            !payMethod ||
            (payMethod !== 'points' && !useSaved && !payPhone.trim()) ||
            (payMethod !== 'points' && useSaved && !selectedSaved) ||
            processing
          }
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
