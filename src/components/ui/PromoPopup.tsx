import { useState } from "react";
import { createPortal } from "react-dom";
import PaymentModal from "../modals/PaymentModal";

interface PromoPopupProps {
  plan: {
    id: string;
    name: string;
    price: number;
    original_price?: number | null;
    duration_months: number;
    features: Record<string, unknown>;
  };
  onSubscribe: (method: "orange" | "mtn" | "points", phone: string) => Promise<void>;
  onDismiss: () => void;
  processing?: boolean;
  pollingStatus?: string | null;
}

export default function PromoPopup({ plan, onSubscribe, onDismiss, processing, pollingStatus }: PromoPopupProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [payError, setPayError] = useState("");
  const [visible, setVisible] = useState(true);

  const originalPrice = plan.original_price ?? 0;
  const discountPct = originalPrice > 0 ? Math.round((1 - plan.price / originalPrice) * 100) : 0;
  const savings = originalPrice - plan.price;

  const handlePay = async (method: "orange" | "mtn" | "points", phone: string) => {
    setPayError("");
    try {
      await onSubscribe(method, phone);
      // Keep popup open if polling is active (mobile money), otherwise close
      if (!pollingStatus) {
        setShowPayment(false);
        setVisible(false);
      }
    } catch (err: any) {
      setPayError(err.message || "Erreur de paiement");
    }
  };

  const handleClose = () => {
    if (processing || !!pollingStatus) return;
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="relative bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
        {/* Sky blue header */}
        <div className="bg-sky-600 p-6 sm:p-8 text-center relative overflow-hidden">
          <img
            src="/src/assets/images/promo.png"
            alt=""
            className="absolute bottom-0 right-0 h-48 w-auto object-contain pointer-events-none select-none"
          />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-200/10 rounded-full blur-2xl pointer-events-none translate-y-1/2 -translate-x-1/4" />

          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/15 text-white/70 hover:bg-black/30 hover:text-white transition-all z-10"
            aria-label="Fermer"
          >
            <i className="fa-solid fa-xmark" />
          </button>

          <div className="relative z-10">
            <img
              src="/src/assets/images/docmaster.png"
              alt="DocMaster"
              className="h-12 mx-auto mb-4 brightness-0 invert object-contain"
            />
            <span className="inline-block bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">
              Offre exclusive -{discountPct}%
            </span>
            <h2 className="font-bricolage text-2xl font-extrabold text-white mb-1">
              VIP {plan.duration_months} mois
            </h2>
            <p className="text-white/70 text-[13px]">
              Propulsez votre expérience DocMaster au niveau supérieur
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          <div className="text-center mb-5">
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="text-textMuted text-lg line-through font-bold">
                {originalPrice.toLocaleString("fr-FR")} XAF
              </span>
              <span className="text-sky-600 text-3xl font-extrabold">
                {plan.price.toLocaleString("fr-FR")} <span className="text-base font-bold text-sky-400">XAF</span>
              </span>
            </div>
            <div className="text-textMuted/60 text-[12px]">
              Économisez {savings.toLocaleString("fr-FR")} XAF — paiement unique
            </div>
          </div>

          <div className="bg-sky-50 rounded-2xl p-4 mb-5">
            <h4 className="font-bricolage text-[13px] font-bold text-sky-700 mb-3 text-center">
              Ce que vous obtenez avec VIP
            </h4>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
              {[
                { icon: "fa-file-circle-check", label: "5 types de documents" },
                { icon: "fa-box-open", label: "Jusqu'à 7 objets" },
                { icon: "fa-bell", label: "Alertes SMS & Email" },
                { icon: "fa-location-dot", label: "Géo-localisation en temps réel" },
                { icon: "fa-circle-check", label: "Badge vérifié" },
                { icon: "fa-headset", label: "Support prioritaire 24/7" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-textMain">
                  <i className={`fa-solid ${f.icon} text-sky-500 text-[10px]`} />
                  <span className="text-[11px] font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowPayment(true)}
            disabled={processing || !!pollingStatus}
            className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-500 hover:from-sky-500 hover:to-blue-400 text-white font-extrabold text-[14px] rounded-xl transition-all active:scale-[0.97] shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {processing || !!pollingStatus ? (
              <><i className="fa-solid fa-spinner fa-spin" /> Activation...</>
            ) : (
              <><i className="fa-solid fa-crown" /> Activer pour {plan.price.toLocaleString("fr-FR")} XAF</>
            )}
          </button>

          <button
            onClick={handleClose}
            className="w-full mt-2 py-2 text-textMuted/50 hover:text-textMuted text-[12px] font-medium transition-colors"
          >
            Non merci
          </button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          isOpen={showPayment && !pollingStatus}
          onClose={() => setShowPayment(false)}
          onPay={handlePay}
          amount={plan.price}
          title="Activer l'offre VIP"
          description={`VIP ${plan.duration_months} mois — ${plan.price.toLocaleString("fr-FR")} XAF`}
          processing={processing || !!pollingStatus}
          error={payError}
          submitLabel="Activer"
        />
      )}
    </div>,
    document.body
  );
}
