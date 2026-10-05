import { useState, useEffect } from "react";
import { Modal, Button, TextInput } from "@mantine/core";
import { useI18n } from "../../context/I18nContext";
import { useToast } from "../../context/ToastContext";
import { paymentsService, type SavedPaymentMethod } from "../../services/paymentsService";
import { validatePhone } from "../../utils/phoneValidation";
import Stepper from "./Stepper";
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

const STEPPER_STEPS = [
  { label: "Méthode de paiement" },
  { label: "Confirmation" },
];

const METHOD_LABELS: Record<string, string> = {
  orange: "Orange Money",
  mtn: "MTN Mobile Money",
  points: "Points DocMaster",
};

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
  const toast = useToast();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMethod, setSelectedMethod] = useState<"orange" | "mtn" | "points" | "">("");

  // Step 2 state
  const [payPhone, setPayPhone] = useState("");
  const [pointsNeeded, setPointsNeeded] = useState<number | null>(null);
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [useSaved, setUseSaved] = useState(false);
  const [selectedSaved, setSelectedSaved] = useState<SavedPaymentMethod | null>(null);
  const [phoneErr, setPhoneErr] = useState("");

  // Reset everything on open/close
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedMethod("");
      setPayPhone("");
      setPhoneErr("");
      setUseSaved(false);
      setSelectedSaved(null);
    }
  }, [isOpen]);

  // Points rate
  useEffect(() => {
    if (amount <= 0) { setPointsNeeded(0); return; }
    api.get("/points/rate").then((res: any) => {
      const rate = res.data.rate || 10;
      setPointsNeeded(Math.ceil(amount * rate));
    });
  }, [amount]);

  // Load saved methods
  useEffect(() => {
    paymentsService.getPaymentMethods()
      .then((res) => { if (res.success && res.data) setSavedMethods(res.data); })
      .catch(() => { toast.warning("Impossible de charger les méthodes de paiement enregistrées"); });
  }, []);

  // Reset phone state when going back or changing method
  useEffect(() => {
    setSelectedSaved(null);
    setPayPhone("");
    setPhoneErr("");
  }, [selectedMethod, useSaved]);

  const savedForMethod = savedMethods.filter((m) => {
    if (selectedMethod === "mtn") return m.method_type === "MTN";
    if (selectedMethod === "orange") return m.method_type === "ORANGE";
    return false;
  });

  const handleContinue = () => {
    if (!selectedMethod) return;
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setPayPhone("");
    setPhoneErr("");
    setUseSaved(false);
    setSelectedSaved(null);
  };

  const handleSubmit = async () => {
    if (!selectedMethod || selectedMethod === ("paypoint" as any)) return;

    if (selectedMethod === "points") {
      await onPay(selectedMethod, "");
      return;
    }

    let phone = "";
    if (useSaved && selectedSaved) {
      phone = selectedSaved.account_number;
    } else {
      phone = payPhone;
    }

    if (!phone.trim()) return;

    const operator = selectedMethod === "mtn" ? "MTN" : "ORANGE";
    const vErr = validatePhone(phone.trim(), operator);
    if (vErr) {
      setPhoneErr(vErr);
      return;
    }

    setPhoneErr("");
    await onPay(selectedMethod, phone);
  };

  // ── Card styles
  const cardBase = "p-3 rounded-[14px] cursor-pointer transition-all border";
  const cardSelected = { border: "2px solid #2D5A42" };
  const cardUnselected = { border: "1px solid #EAE3D8" };

  // ── Step 1 — method selection
  const renderStep1 = () => (
    <>
      <Stepper steps={STEPPER_STEPS} currentStep={1} orientation="horizontal" />

      <h2 className="font-bricolage text-lg font-black text-textMain mb-1">
        Choisir votre moyen de paiement
      </h2>
      {description && (
        <p className="text-[12px] text-textMuted mb-4 leading-relaxed">{description}</p>
      )}

      {children}

      {/* Amount */}
      <div className="p-4 bg-bgMain rounded-[16px] mb-5">
        <p className="text-[10px] font-bold text-textMuted uppercase mb-1">{t("payment_amount")}</p>
        <p className="font-bricolage text-2xl font-black text-primary">
          {amount.toLocaleString("fr-FR")} FCFA
        </p>
      </div>

      {/* Mobile Money */}
      <div className="space-y-4 mb-5">
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase font-bold text-textMuted">Mobile Money</p>

          {/* Orange Money */}
          <div
            className={cardBase}
            style={selectedMethod === "orange" ? cardSelected : cardUnselected}
            onClick={() => setSelectedMethod("orange")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] border border-borderMain flex items-center justify-center flex-shrink-0">
                <span className="font-bricolage font-black text-base" style={{ color: "#F97316" }}>O</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-textMain">Orange Money</p>
                <p className="text-[11px] text-textMuted">{t("payment_orange_sublabel")}</p>
              </div>
              {selectedMethod === "orange" && (
                <i className="fa-solid fa-circle-check text-green-dark text-sm flex-shrink-0" />
              )}
            </div>
          </div>

          {/* MTN Mobile Money */}
          <div
            className={cardBase}
            style={selectedMethod === "mtn" ? cardSelected : cardUnselected}
            onClick={() => setSelectedMethod("mtn")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] border border-borderMain flex items-center justify-center flex-shrink-0">
                <span className="font-bricolage font-black text-base" style={{ color: "#EAB308" }}>M</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-textMain">MTN Mobile Money</p>
                <p className="text-[11px] text-textMuted">{t("payment_mtn_sublabel")}</p>
              </div>
              {selectedMethod === "mtn" && (
                <i className="fa-solid fa-circle-check text-green-dark text-sm flex-shrink-0" />
              )}
            </div>
          </div>
        </div>

        {/* Autres */}
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase font-bold text-textMuted">Autres</p>

          {/* Points */}
          <div
            className={cardBase}
            style={selectedMethod === "points" ? cardSelected : cardUnselected}
            onClick={() => setSelectedMethod("points")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] border border-borderMain flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-star" style={{ color: "#F5A64B" }} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-textMain">Payer avec mes Points</p>
                <p className="text-[11px] text-textMuted">
                  {pointsNeeded === null ? "Chargement..." : `Coût: ${pointsNeeded} pts`}
                </p>
              </div>
              {selectedMethod === "points" && (
                <i className="fa-solid fa-circle-check text-green-dark text-sm flex-shrink-0" />
              )}
            </div>
          </div>

          {/* PayPoint (disabled) */}
          <div className="p-3 border rounded-[14px] opacity-50 cursor-not-allowed" style={{ border: "1px solid #EAE3D8" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] border border-borderMain flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-credit-card text-textMuted" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-gray-500">PayPoint</p>
                <p className="text-[11px] text-gray-400">Bientôt disponible</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button
        fullWidth
        radius="xl"
        disabled={!selectedMethod}
        onClick={handleContinue}
        style={{ backgroundColor: "#2D5A42", color: "#fff" }}
      >
        Continuer →
      </Button>
    </>
  );

  // ── Step 2 — phone + confirm
  const renderStep2 = () => {
    const methodLabel = selectedMethod ? METHOD_LABELS[selectedMethod] || selectedMethod : "";
    const isPhoneMethod = selectedMethod !== "points";

    const canSubmit =
      selectedMethod &&
      (
        selectedMethod === "points" ||
        (useSaved && !!selectedSaved) ||
        (!useSaved && !!payPhone.trim())
      ) &&
      !processing;

    return (
      <>
        <Stepper steps={STEPPER_STEPS} currentStep={2} orientation="horizontal" />

        <button
          onClick={handleBack}
          className="text-[12px] text-textMuted hover:text-textMain flex items-center gap-1 mb-4 transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-xs" /> Retour
        </button>

        <h2 className="font-bricolage text-lg font-black text-textMain mb-1">
          Entrez votre numéro {methodLabel}
        </h2>

        {/* Selected method indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-[8px] border border-borderMain flex items-center justify-center flex-shrink-0">
            {selectedMethod === "orange" && <span className="font-bricolage font-black text-sm" style={{ color: "#F97316" }}>O</span>}
            {selectedMethod === "mtn" && <span className="font-bricolage font-black text-sm" style={{ color: "#EAB308" }}>M</span>}
            {selectedMethod === "points" && <i className="fa-solid fa-star text-xs" style={{ color: "#F5A64B" }} />}
          </div>
          <span className="text-[13px] font-semibold text-textMain">{methodLabel}</span>
        </div>

        {/* Amount */}
        <div className="p-4 bg-bgMain rounded-[16px] mb-5">
          <p className="text-[10px] font-bold text-textMuted uppercase mb-1">{t("payment_amount")}</p>
          <p className="font-bricolage text-2xl font-black text-primary">
            {amount.toLocaleString("fr-FR")} FCFA
          </p>
          {selectedMethod === "points" && pointsNeeded != null && (
            <p className="text-[11px] text-textMuted mt-1">
              <i className="fa-solid fa-star text-xs mr-1" style={{ color: "#F5A64B" }} />
              Coût en points : {pointsNeeded} pts
            </p>
          )}
        </div>

        {/* Phone input section */}
        {isPhoneMethod && (
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
                    onClick={() => setUseSaved(true)}
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
                        className="flex items-center gap-2.5 p-2.5 rounded-[10px] cursor-pointer transition-all border"
                        style={selectedSaved?.id === m.id ? { border: "2px solid #2D5A42" } : { border: "1px solid #EAE3D8" }}
                      >
                        <div className="w-7 h-7 rounded-[8px] border border-borderMain flex items-center justify-center">
                          <i className={`fa-solid fa-mobile-screen-button text-[10px] ${selectedMethod === "mtn" ? "text-yellow-500" : "text-orange-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-textMain truncate">{m.account_number}</p>
                          {m.account_name && <p className="text-[10px] text-textMuted truncate">{m.account_name}</p>}
                        </div>
                        {selectedSaved?.id === m.id && <i className="fa-solid fa-circle-check text-green-dark text-xs" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!useSaved && (
              <TextInput
                label="Numéro de téléphone"
                placeholder="ex: 6XXXXXXXX"
                type="tel"
                value={payPhone}
                onChange={(e) => { setPayPhone(e.target.value); setPhoneErr(""); }}
                error={phoneErr || undefined}
                radius="md"
                mb="xs"
              />
            )}

            {phoneErr && !useSaved && (
              <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                <i className="fa-solid fa-circle-exclamation" /> {phoneErr}
              </p>
            )}

            {selectedMethod === "mtn" && !useSaved && (
              <p className="text-[10px] text-textMuted mt-1">{t("payment_phone_mtn_hint")}</p>
            )}
            {selectedMethod === "orange" && !useSaved && (
              <p className="text-[10px] text-textMuted mt-1">{t("payment_phone_orange_hint")}</p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-[12px] text-[12px] text-red-600 font-semibold mb-4 flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </div>
        )}

        {termsText && (
          <p className="text-[10px] text-textMuted text-center mb-4 leading-relaxed">{termsText}</p>
        )}

        <Button
          fullWidth
          radius="xl"
          disabled={!canSubmit}
          onClick={handleSubmit}
          style={{ backgroundColor: "#2D5A42", color: "#fff" }}
        >
          {processing ? (
            <><i className="fa-solid fa-spinner fa-spin mr-1" /> {t("payment_processing")}</>
          ) : (
            submitLabel || `Payer ${amount.toLocaleString("fr-FR")} FCFA`
          )}
        </Button>
      </>
    );
  };

  return (
    <Modal opened={isOpen} onClose={onClose} size="md" withCloseButton={false} padding="lg">
      {step === 1 ? renderStep1() : renderStep2()}
    </Modal>
  );
}
