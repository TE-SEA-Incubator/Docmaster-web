import { useState, useEffect } from "react";
import { Button, TextInput, Alert } from "@mantine/core";
import { useI18n } from "../../context/I18nContext";
import { useToast } from "../../context/ToastContext";
import { paymentsService, type SavedPaymentMethod } from "../../services/paymentsService";
import { validatePhone } from "../../utils/phoneValidation";
import Stepper from "./Stepper";
import api from "../../services/api";
import orangeMoneyLogo from "../../assets/images/orange.png";
import mtnMomoLogo from "../../assets/images/mtn.png";
import {
  Dialog,
  DialogContent,
  DialogBody,
} from "../ui/dialog";

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
    <div className="space-y-5">
      <div className="pb-4 border-b border-borderMain">
        <Stepper steps={STEPPER_STEPS} currentStep={1} orientation="horizontal" />
      </div>

      <div>
        <h2 className="font-bricolage text-xl font-extrabold text-textMain mb-2">
          Choisir votre moyen de paiement
        </h2>
        {description && (
          <p className="text-[13px] text-textMuted mb-4 leading-relaxed">{description}</p>
        )}
      </div>

      {children}

      {/* Amount */}
      <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
        <p className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-1.5">
          {t("payment_amount")}
        </p>
        <p className="font-bricolage text-3xl font-black text-primary">
          {amount.toLocaleString("fr-FR")} <span className="text-xl">FCFA</span>
        </p>
      </div>

      {/* Mobile Money */}
      <div className="space-y-4">
        <div className="space-y-3">
          <p className="text-[11px] uppercase font-bold text-textMuted tracking-wider flex items-center gap-2">
            <i className="ph ph-device-mobile text-sm" />
            Mobile Money
          </p>

          {/* Orange Money */}
          <div
            className={`${cardBase} ${selectedMethod === "orange" ? "border-2 border-primary bg-primary/5 shadow-md" : "border border-borderMain hover:border-primary/50"}`}
            onClick={() => setSelectedMethod("orange")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden bg-white p-2 border border-borderMain">
                <img src={orangeMoneyLogo} alt="Orange Money" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-textMain">Orange Money</p>
                <p className="text-[12px] text-textMuted">{t("payment_orange_sublabel")}</p>
              </div>
              {selectedMethod === "orange" && (
                <i className="ph-fill ph-check-circle text-primary text-xl flex-shrink-0" />
              )}
            </div>
          </div>

          {/* MTN Mobile Money */}
          <div
            className={`${cardBase} ${selectedMethod === "mtn" ? "border-2 border-primary bg-primary/5 shadow-md" : "border border-borderMain hover:border-primary/50"}`}
            onClick={() => setSelectedMethod("mtn")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden bg-white p-2 border border-borderMain">
                <img src={mtnMomoLogo} alt="MTN Mobile Money" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-textMain">MTN Mobile Money</p>
                <p className="text-[12px] text-textMuted">{t("payment_mtn_sublabel")}</p>
              </div>
              {selectedMethod === "mtn" && (
                <i className="ph-fill ph-check-circle text-primary text-xl flex-shrink-0" />
              )}
            </div>
          </div>

        </div>

        {/* Autres */}
        <div className="space-y-3">
          <p className="text-[11px] uppercase font-bold text-textMuted tracking-wider flex items-center gap-2">
            <i className="ph ph-wallet text-sm" />
            Autres
          </p>

          {/* Points */}
          <div
            className={`${cardBase} ${selectedMethod === "points" ? "border-2 border-primary bg-primary/5 shadow-md" : "border border-borderMain hover:border-primary/50"}`}
            onClick={() => setSelectedMethod("points")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border border-borderMain flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary/10 to-primary/5">
                <i className="ph-fill ph-star text-2xl" style={{ color: "#F5A64B" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-textMain">Payer avec mes Points</p>
                <p className="text-[12px] text-textMuted">
                  {pointsNeeded === null ? "Chargement..." : `Coût: ${pointsNeeded} pts`}
                </p>
              </div>
              {selectedMethod === "points" && (
                <i className="ph-fill ph-check-circle text-primary text-xl flex-shrink-0" />
              )}
            </div>
          </div>

          {/* PayPoint (disabled) */}
          <div className="p-4 border rounded-2xl opacity-50 cursor-not-allowed border-borderMain bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border border-borderMain flex items-center justify-center flex-shrink-0 bg-white">
                <i className="ph ph-credit-card text-textMuted text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-gray-500">PayPoint</p>
                <p className="text-[12px] text-gray-400">Bientôt disponible</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button
        fullWidth
        size="lg"
        radius="xl"
        disabled={!selectedMethod}
        onClick={handleContinue}
        style={{ 
          backgroundColor: selectedMethod ? "#2D5A42" : undefined, 
          color: "#fff",
          height: 48,
          fontSize: '14px',
          fontWeight: 700
        }}
      >
        Continuer <i className="ph ph-arrow-right ml-2" />
      </Button>
    </div>
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
      <div className="space-y-5">
        <div className="pb-4 border-b border-borderMain">
          <Stepper steps={STEPPER_STEPS} currentStep={2} orientation="horizontal" />
        </div>

        <button
          onClick={handleBack}
          className="text-[13px] text-textMuted hover:text-textMain flex items-center gap-2 transition-colors font-semibold"
        >
          <i className="ph ph-arrow-left" /> Retour
        </button>

        <div>
          <h2 className="font-bricolage text-xl font-extrabold text-textMain mb-2">
            {selectedMethod === "points" ? "Confirmation du paiement" : `Entrez votre numéro ${methodLabel}`}
          </h2>

          {/* Selected method indicator */}
          <div className="flex items-center gap-3 p-3 bg-bgMain rounded-xl border border-borderMain">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white p-1.5 border border-borderMain">
              {selectedMethod === "orange" && <img src={orangeMoneyLogo} alt="Orange Money" className="w-full h-full object-contain" />}
              {selectedMethod === "mtn" && <img src={mtnMomoLogo} alt="MTN Mobile Money" className="w-full h-full object-contain" />}
              {selectedMethod === "points" && (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ph-fill ph-star text-lg" style={{ color: "#F5A64B" }} />
                </div>
              )}
            </div>
            <span className="text-[14px] font-bold text-textMain">{methodLabel}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
          <p className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-1.5">
            {t("payment_amount")}
          </p>
          <p className="font-bricolage text-3xl font-black text-primary">
            {amount.toLocaleString("fr-FR")} <span className="text-xl">FCFA</span>
          </p>
          {selectedMethod === "points" && pointsNeeded != null && (
            <p className="text-[12px] text-textMuted mt-2 flex items-center gap-1.5">
              <i className="ph-fill ph-star" style={{ color: "#F5A64B" }} />
              Coût en points : <span className="font-bold">{pointsNeeded} pts</span>
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
                          <i className={`ph ph-device-mobile text-[10px] ${selectedMethod === "mtn" ? "text-yellow-500" : "text-orange-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-textMain truncate">{m.account_number}</p>
                          {m.account_name && <p className="text-[10px] text-textMuted truncate">{m.account_name}</p>}
                        </div>
                        {selectedSaved?.id === m.id && <i className="ph ph-check-circle text-green-dark text-xs" />}
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
                <i className="ph ph-warning-circle" /> {phoneErr}
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
          <Alert color="red" variant="light" radius="md" mb="md" icon={<i className="ph ph-warning-circle" />}>
            {error}
          </Alert>
        )}

        {termsText && (
          <p className="text-[11px] text-textMuted text-center leading-relaxed p-3 bg-bgMain rounded-xl">{termsText}</p>
        )}

        <Button
          fullWidth
          size="lg"
          radius="xl"
          disabled={!canSubmit}
          onClick={handleSubmit}
          loading={processing}
          style={{ 
            backgroundColor: canSubmit ? "#2D5A42" : undefined, 
            color: "#fff",
            height: 48,
            fontSize: '14px',
            fontWeight: 700
          }}
        >
          {processing ? (
            <>{t("payment_processing")}</>
          ) : (
            <>{submitLabel || `Payer ${amount.toLocaleString("fr-FR")} FCFA`} <i className="ph ph-lock-simple ml-2" /></>
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogBody className="p-6">
          {step === 1 ? renderStep1() : renderStep2()}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
