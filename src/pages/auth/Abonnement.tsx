import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { subscriptionsService } from "../../services/subscriptionsService";
import { paymentsService } from "../../services/paymentsService";
import { useI18n } from "../../context/I18nContext";
import Topbar from "../../layout/Topbar";
import PaymentModal from "../../components/modals/PaymentModal";
import type { Plan, Transaction } from "../../types/api";

export default function Abonnement() {
  const { user } = useAuth();
  const { t } = useI18n();

  // Plans
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Usage
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Billing toggle
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  // Subscription modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);

  // Cancel modal
  const [cancelOpen, setCancelOpen] = useState(false);

  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());

  const loadData = useCallback(async () => {
    setLoadingPlans(true);
    setLoadingUsage(true);
    setLoadingTransactions(true);
    try {
      const [plansRes, usageRes, txRes] = await Promise.all([
        subscriptionsService.getAllPlans(),
        subscriptionsService.getUsage(),
        paymentsService.getMyTransactions().catch(() => ({ success: false, data: [] })),
      ]);
      console.log("[Abonnement] getAllPlans:", plansRes);
      console.log("[Abonnement] getUsage:", usageRes);
      console.log("[Abonnement] getMyTransactions:", txRes);
      if (plansRes.success && plansRes.data) setPlans(plansRes.data);
      if (usageRes.success && usageRes.data) setUsage(usageRes.data);
      if ((txRes as { success: boolean; data?: Transaction[] }).success && (txRes as { success: boolean; data?: Transaction[] }).data)
        setTransactions((txRes as { success: boolean; data?: Transaction[] }).data!);
    } catch (e: any) {
      console.error("[Abonnement] loadData error:", e?.response?.data || e);
    } finally {
      setLoadingPlans(false);
      setLoadingUsage(false);
      setLoadingTransactions(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Subscribe ──
  const openSubscribeModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setPollingStatus(null);
    setPayError("");
    setModalOpen(true);
  };

  const closeSubscribeModal = () => {
    setModalOpen(false);
    setSelectedPlan(null);
    setPollingStatus(null);
    setPayError("");
  };

  const handlePay = async (method: "orange" | "mtn", phone: string) => {
    setProcessing(true);
    setPayError("");
    try {
      const paymentMethod = method === "orange" ? "ORANGE_MONEY" : "MTN_MOMO";
      const months = billingPeriod === "annual" ? 12 : 1;
      const result = await subscriptionsService.subscribe({
        planId: selectedPlan!.id,
        months,
        paymentMethod,
      });
      if (result.success) {
        setPollingStatus(t("abonnement_payment_pending"));
        startPolling();
      } else {
        setPayError(result.message || t("abonnement_subscribe_error"));
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || t("abonnement_subscribe_error");
      setPayError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        const res = await subscriptionsService.getUsage();
        if (res.success && res.data?.subscription_id) {
          clearInterval(interval);
          alert(t("abonnement_success"));
          closeSubscribeModal();
          loadData();
        }
        } catch (e: any) {
          console.error("[Abonnement] polling error:", e?.response?.data || e);
        }
    }, 5000);
    setTimeout(() => clearInterval(interval), 300000);
  };

  // ── Helpers ──
  const currentPlan = usage?.plan_name || t("abonnement_plan_free");
  const currentPlanObj = plans.find((p) => p.name?.toLowerCase() === currentPlan.toLowerCase());
  const percentage = usage?.percentage || 0;

  const displayedPlans = billingPeriod === "annual"
    ? plans.map((p) => ({ ...p, price: Math.round((p.price || 0) * 12 * 0.8) }))
    : plans;

  function normalizeFeatures(raw: any): { label: string; value: string; icon?: string }[] {
    if (!raw) return [];
    
    // If it's the standard features object from DB
    if (typeof raw === "object" && !Array.isArray(raw)) {
      const featureMap: Record<string, { label: string; icon: string }> = {
        objects: { label: "Appareils & Objets", icon: "fa-mobile-screen" },
        docs_per_type: { label: "Documents par type", icon: "fa-file-shield" },
        vault: { label: "Coffre-fort numérique", icon: "fa-vault" },
        prioritaire: { label: "Support Prioritaire", icon: "fa-headset" },
        certification: { label: "Certification DocMaster", icon: "fa-certificate" },
        ads: { label: "Publicité", icon: "fa-rectangle-ad" },
        matching_speed: { label: "Vitesse Matching", icon: "fa-bolt" },
        notifications: { label: "Alertes Temps Réel", icon: "fa-bell" }
      };

      return Object.entries(raw).map(([key, val]) => {
        const meta = featureMap[key];
        let value = String(val);
        if (val === true) value = "Inclus";
        if (val === false) value = "Non inclus";
        if (key === "matching_speed") value = val === "high" ? "Instantané" : val === "normal" ? "Standard" : String(val);
        
        return {
          label: meta?.label || key,
          value,
          icon: meta?.icon || "fa-check"
        };
      });
    }

    if (Array.isArray(raw)) {
      return raw.map((f: any) => {
        if (typeof f === "string") return { label: "", value: f, icon: "fa-check" };
        return { 
          label: f?.label || "", 
          value: f?.valeur || f?.name || "",
          icon: f?.icon || "fa-check"
        };
      });
    }
    return [];
  }

  function featureIcon(f: { label: string; value: string; icon?: string }): string {
    if (f.icon) return `fa-solid ${f.icon}`;
    const txt = (f.label + " " + f.value).toLowerCase();
    if (txt.includes("doc") || txt.includes("declaration")) return "fa-solid fa-file-lines";
    if (txt.includes("appareil") || txt.includes("device")) return "fa-solid fa-mobile-screen";
    if (txt.includes("support") || txt.includes("prioritaire")) return "fa-solid fa-headset";
    if (txt.includes("coffre") || txt.includes("vault") || txt.includes("stockage")) return "fa-solid fa-cloud";
    if (txt.includes("partenair") || txt.includes("agence")) return "fa-solid fa-building-columns";
    if (txt.includes("statist") || txt.includes("rapport")) return "fa-solid fa-chart-simple";
    if (txt.includes("retrait") || txt.includes("point")) return "fa-solid fa-location-dot";
    if (txt.includes("api")) return "fa-solid fa-code";
    return "fa-solid fa-check";
  }

  return (
    <div className="flex flex-col h-full">
      <style>{`
        .plan-card { transition: all .4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .plan-card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 20px 50px rgba(0,0,0,.15); }
        .plan-card.featured { box-shadow: 0 10px 40px rgba(245,166,75,.3); }
        .plan-card.featured:hover { box-shadow: 0 25px 60px rgba(245,166,75,.45); }
        .tab-btn { transition: all .3s ease; }
        .tab-btn.active { background: #1E3A2F; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .feature-item { transition: transform 0.2s ease; }
        .plan-card:hover .feature-item { transform: translateX(4px); }
      `}</style>

      <Topbar
        title={t("abonnement_title")}
        breadcrumbs={[
          { label: t("abonnement_breadcrumb_home"), href: "/dashboard" },
          { label: t("abonnement_breadcrumb_subscription") },
        ]}
      />

      <div className="custom-scroll p-4 md:p-6 flex flex-col gap-5 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">

        {/* Greeting */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-bricolage text-lg md:text-xl font-extrabold text-textMain tracking-tight leading-tight">
              {t("abonnement_greeting")}, <span>{user?.prenom || t("dashboard_user")}</span>
            </h1>
            <p className="text-[12.5px] md:text-[13.5px] text-textMuted font-medium mt-0.5 italic">{t("abonnement_manage")}</p>
          </div>
          <div className="text-[11.5px] text-textMuted font-medium bg-white border border-borderMain px-3 py-1.5 rounded-[9px] flex items-center gap-2 whitespace-nowrap">
            <i className="fa-regular fa-calendar text-primary" />
            <span>{today}</span>
          </div>
        </div>

        {/* Current plan card */}
        <div className="bg-green-dark rounded-[20px] p-5 md:p-6 relative overflow-hidden shadow-2xl shadow-green-950/40 min-h-[190px] flex items-center">
          <div className="absolute w-80 h-80 rounded-full bg-primary/10 -top-24 -right-24 blur-3xl pointer-events-none" />
          <div className="absolute w-40 h-40 rounded-full bg-white/5 bottom-0 left-24 blur-2xl pointer-events-none" />

          <div className="relative z-10 w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex-1 w-full">
              <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 mb-5">
                <i className="fa-solid fa-bolt text-primary text-[10px] animate-pulse" />
                <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{t("abonnement_current_plan")}</span>
              </div>
              <h1 className="font-bricolage text-2xl md:text-4xl font-extrabold text-white leading-tight mb-2">
                {loadingUsage ? (
                  <span className="inline-block w-40 h-8 bg-white/10 rounded animate-pulse" />
                ) : (
                    `${t("abonnement_plan")} ${currentPlan}`
                )}
              </h1>
              <p className="text-white/60 text-[13px] md:text-[14px] mb-5 max-w-lg">
                {loadingUsage ? (
                  <span className="inline-block w-60 h-4 bg-white/10 rounded animate-pulse" />
                ) : (
                  <>
                    Quota utilisé : <strong className="text-white/90">{usage?.usage?.objects || 0}</strong> / {usage?.limits?.objects || 0} objets
                  </>
                )}
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-3 bg-white/10 border border-white/10 backdrop-blur-xl rounded-2xl px-4 py-2 transition-transform hover:scale-105">
                  <i className="fa-solid fa-file-circle-check text-primary text-lg" />
                  <div className="flex flex-col">
                    <span className="text-white/90 text-[12px] font-bold leading-none">
                      {usage?.limits?.docs_per_type || 0} Document{(usage?.limits?.docs_per_type || 0) > 1 ? "s" : ""}
                    </span>
                    <span className="text-white/40 text-[10px] uppercase font-bold mt-1">Par type</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 border border-white/10 backdrop-blur-xl rounded-2xl px-4 py-2 transition-transform hover:scale-105">
                  <i className="fa-solid fa-box-open text-primary text-lg" />
                  <div className="flex flex-col">
                    <span className="text-white/90 text-[12px] font-bold leading-none">{usage?.usage?.objects || 0} Objet{(usage?.usage?.objects || 0) > 1 ? "s" : ""}</span>
                    <span className="text-white/40 text-[10px] uppercase font-bold mt-1">Sur {usage?.limits?.objects || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col items-center min-w-[180px] backdrop-blur-md">
              <div className="relative w-24 h-24 mb-3">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#F5A64B" strokeWidth="6" strokeDasharray="213.6"
                    strokeDashoffset={213.6 - (percentage / 100) * 213.6} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bricolage text-xl font-black text-white leading-none">{percentage}%</span>
                  <span className="text-white/40 text-[9px] font-bold uppercase mt-1">Quota</span>
                </div>
              </div>
              <div className="text-white/50 text-[11px] font-bold uppercase tracking-widest mb-3">Capacité utilisée</div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 className="font-bricolage text-xl font-bold text-textMain">Choisir un plan</h2>
            <div className="flex items-center gap-1 self-start sm:self-auto bg-white border border-borderMain rounded-[12px] p-1">
              <button
                className={`tab-btn px-4 py-2 rounded-[9px] text-[12.5px] font-bold ${billingPeriod === "monthly" ? "active" : "text-textMuted"}`}
                onClick={() => setBillingPeriod("monthly")}
              >
                Mensuel
              </button>
              <button
                className={`tab-btn px-4 py-2 rounded-[9px] text-[12.5px] font-bold ${billingPeriod === "annual" ? "active" : "text-textMuted"}`}
                onClick={() => setBillingPeriod("annual")}
              >
                Annuel
                <span className="ml-1.5 text-[10px] font-bold text-green-mid bg-green-light px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loadingPlans ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white border border-borderMain rounded-[20px] p-5 flex flex-col animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-[12px] mb-3" />
                    <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded-md w-1/2 mb-6" />
                    <div className="h-8 bg-gray-200 rounded-md w-full mb-4" />
                    <div className="space-y-2 mb-6">
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </div>
                    <div className="h-10 bg-gray-200 rounded-xl w-full" />
                  </div>
                ))}
              </>
            ) : (
              displayedPlans.map((plan, idx) => {
                const isFeatured = plan.popular || plan.id === currentPlan.toLowerCase() || idx === 1;
                const isCurrent = plan.name?.toLowerCase() === currentPlan.toLowerCase();
                const features = normalizeFeatures(plan.features);
                const displayPrice = plan.price || 0;

                return (
                  <div
                    key={plan.id || idx}
                    className={`plan-card rounded-[20px] p-5 flex flex-col ${isFeatured ? "featured bg-green-dark relative overflow-hidden" : "bg-white border border-borderMain"}`}
                    style={isFeatured ? { background: "#1E3A2F" } : {}}
                  >
                    {isFeatured && <div className="absolute w-40 h-40 rounded-full bg-primary/8 -bottom-10 -right-10 pointer-events-none" />}
                    <div className="mb-4 relative z-10">
                      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3" style={{ background: isFeatured ? "rgba(245,166,75,.15)" : "rgba(245,166,75,.1)" }}>
                        <i className={`fa-solid ${isFeatured ? "fa-rocket" : "fa-star"} text-primary text-base`} />
                      </div>
                      <div className={`font-bricolage text-lg font-bold ${isFeatured ? "text-white" : "text-textMain"}`}>{plan.name}</div>
                      <div className={`text-[12.5px] font-medium ${isFeatured ? "text-white/50" : "text-textMuted"}`}>{isFeatured ? "Recommandé" : "Populaire"}</div>
                    </div>
                    <div className="mb-5 relative z-10">
                      <div className={`font-bricolage text-3xl font-extrabold leading-none ${isFeatured ? "text-white" : "text-textMain"}`}>
                        {displayPrice.toLocaleString("fr-FR")} <span className={`text-base font-bold ${isFeatured ? "text-white/50" : "text-textMuted"}`}>XAF</span>
                      </div>
                      <div className={`text-[12px] ${isFeatured ? "text-white/50" : "text-textMuted"} mt-0.5`}>{billingPeriod === "annual" ? "/an" : "/mois"}</div>
                    </div>
                    <div className="flex flex-col gap-2.5 flex-1 mb-5 relative z-10">
                      {features.map((f, fi) => (
                        <div key={fi} className="flex items-center gap-2.5 text-[13px]">
                          <i className={`${featureIcon(f)} w-4 flex-shrink-0 text-[11px] ${isFeatured ? "text-primary" : "text-primary"}`} />
                          <span className={`${isFeatured ? "text-white" : "text-textMain"} font-medium`}>
                            {f.label ? <><span className={isFeatured ? "text-white/60" : "text-textMuted/70"}>{f.label} : </span></> : null}
                            <span className={f.value === "Non inclus" ? "opacity-40" : ""}>{f.value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => isCurrent ? null : openSubscribeModal(plan)}
                      disabled={isCurrent}
                      className={`relative z-10 w-full py-2.5 rounded-[12px] text-[13.5px] font-bold transition-all active:scale-[.98] ${
                        isCurrent
                          ? "bg-white/20 text-white/60 cursor-default"
                          : isFeatured
                            ? "bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20"
                            : "bg-white border border-borderMain text-textMain hover:border-primary hover:text-primary"
                      }`}
                    >
                      {isCurrent ? "Plan actuel" : `Passer au ${plan.name}`}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-white border border-borderMain rounded-[20px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-borderMain">
            <h2 className="font-bricolage text-base font-bold text-textMain flex items-center gap-2">
              <i className="fa-solid fa-receipt text-primary text-sm" /> Historique de facturation
            </h2>
          </div>
          <div className="divide-y divide-borderMain">
            {loadingTransactions ? (
              <div className="p-8 text-center">
                <i className="fa-solid fa-circle-notch fa-spin text-primary text-xl mb-2" />
                <p className="text-xs text-textMuted font-medium">Chargement de vos transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-5 py-8 text-center text-textMuted text-[13.5px]">Aucune transaction trouvée.</div>
            ) : (
              transactions.map((t: any, i: number) => {
                const date = t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
                const statusClass = t.status === "SUCCESS" ? "bg-green-100 text-green-700" : t.status === "PENDING" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700";
                const statusText = t.status === "SUCCESS" ? "Payé" : t.status === "PENDING" ? "En cours" : "Échoué";
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors">
                    <div className="w-9 h-9 rounded-[10px] bg-green-light flex items-center justify-center flex-shrink-0">
                      <i className={`fa-solid ${t.type === "subscription" ? "fa-bolt" : "fa-file-invoice"} text-green-mid text-sm`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-textMain">{t.description || "Abonnement"}</div>
                      <div className="text-[11.5px] text-textMuted italic">{date} · {t.payment_method || t.method || "-"}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[13.5px] font-bold text-textMain">{t.amount || 0} XAF</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass}`}>{statusText}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment method + Cancel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-borderMain rounded-[18px] p-5">
            <h3 className="font-bricolage text-base font-bold text-textMain mb-4 flex items-center gap-2">
              <i className="fa-solid fa-credit-card text-primary text-sm" /> Moyen de paiement
            </h3>
            <div className="flex items-center gap-3 p-3.5 bg-bgMain border border-borderMain rounded-[12px] mb-3">
              <div className="w-10 h-7 bg-[#F96900] rounded-[6px] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[9px] font-extrabold tracking-tight">MTN</span>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-textMain">MTN Mobile Money</div>
                <div className="text-[11.5px] text-textMuted">{user?.telephone || "+237 6XX XXX XXX"}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Actif</span>
            </div>
            <button className="w-full py-2.5 rounded-[12px] bg-bgMain border border-borderMain text-textMain text-[13px] font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
              <i className="fa-solid fa-plus text-[11px]" /> Ajouter un moyen de paiement
            </button>
          </div>

          <div className="bg-white border border-borderMain rounded-[18px] p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bricolage text-base font-bold text-textMain mb-2 flex items-center gap-2">
                <i className="fa-solid fa-circle-xmark text-red-400 text-sm" /> Gestion de l'abonnement
              </h3>
              <p className="text-[12.5px] text-textMuted leading-relaxed mb-4">
                Votre abonnement se renouvelle automatiquement. Vous pouvez l'annuler à tout moment sans frais supplémentaires.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button className="w-full py-2.5 rounded-[12px] bg-bgMain border border-borderMain text-textMain text-[13px] font-bold hover:border-textMain transition-colors">
                Mettre en pause
              </button>
              <button
                onClick={() => setCancelOpen(true)}
                className="w-full py-2.5 rounded-[12px] bg-red-50 border border-red-100 text-red-600 text-[13px] font-bold hover:bg-red-100 transition-colors"
              >
                Annuler l'abonnement
              </button>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="bg-white border border-borderMain rounded-[20px] overflow-hidden">
          <div className="px-5 py-4 border-b border-borderMain">
            <h2 className="font-bricolage text-base font-bold text-textMain flex items-center gap-2">
              <i className="fa-solid fa-table-columns text-primary text-sm" /> Comparatif complet des plans
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-borderMain">
                  <th className="text-left px-5 py-3 text-[12px] font-bold text-textMuted uppercase tracking-wide w-2/5">Fonctionnalité</th>
                  {plans.map((p, i) => (
                    <th key={i} className={`px-3 py-3 text-center text-[12.5px] font-bold ${p.popular ? "text-primary bg-primary/5" : "text-textMuted"}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-borderMain">
                {plans.length > 0 && (() => {
                  const allFeatures = plans.map((p) => normalizeFeatures(p.features));
                  
                  // Get unique labels across all plans
                  const labelSet = new Set<string>();
                  allFeatures.forEach(feats => feats.forEach(f => { if(f.label) labelSet.add(f.label); }));
                  const labels = Array.from(labelSet);

                  return labels.map((label, fi) => (
                    <tr key={fi} className="hover:bg-surface2 transition-colors">
                      <td className="px-5 py-3 text-[13px] font-medium text-textMain">{label}</td>
                      {plans.map((plan, pi) => {
                        const feats = allFeatures[pi];
                        const f = feats.find(feat => feat.label === label);
                        const val = f ? f.value : "—";
                        const tClass = plan.popular ? "text-primary" : "text-textMuted";
                        const isSuccess = val === "Inclus" || val === "Instantané" || (typeof val === "string" && !isNaN(Number(val)) && Number(val) > 0);
                        const isFailure = val === "Non inclus";
                        
                        const icon = val === "Inclus" ? "fa-solid fa-check text-green-500" : val === "Non inclus" ? "fa-solid fa-xmark text-gray-300" : "";
                        
                        return (
                          <td key={pi} className={`px-3 py-3 text-center text-[13px] font-semibold ${tClass} ${plan.popular ? "bg-primary/5" : ""}`}>
                            {icon ? <i className={icon} /> : <span className={isFailure ? "opacity-30" : ""}>{val}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Subscription Modal ─── */}
      {modalOpen && !pollingStatus && (
        <PaymentModal
          isOpen={modalOpen && !pollingStatus}
          onClose={closeSubscribeModal}
          onPay={handlePay}
          amount={selectedPlan?.price || 0}
          title="Finaliser l'abonnement"
          description="Étape sécurisée par DocMaster Pay"
          processing={processing}
          error={payError}
          submitLabel="Confirmer le paiement"
        >
          {/* Invoice summary */}
          <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 relative overflow-hidden mb-5">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl" />
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl shadow-inner">
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <div>
                  <h4 className="font-bricolage text-lg font-black text-slate-900 leading-none">{selectedPlan?.name || "-"}</h4>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Plan sélectionné</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bricolage text-2xl font-black text-primary leading-none">
                  {(selectedPlan?.price || 0).toLocaleString("fr-FR")} FCFA
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Montant Total</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200/60 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 text-xs">
                  <i className="fa-solid fa-calendar-check" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black">Validité</p>
                  <span className="text-slate-800 text-[13px] font-bold uppercase tracking-tight">
                    {billingPeriod === "annual" ? "12 MOIS" : "30 JOURS"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 text-xs">
                  <i className="fa-solid fa-file-shield" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black">Quota Docs</p>
                  <span className="text-slate-800 text-[13px] font-bold uppercase tracking-tight">
                    {(normalizeFeatures(selectedPlan?.features)[0]?.value ?? "-").replace(/^(\d+).*/, "$1") || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </PaymentModal>
      )}

      {/* ─── Polling status (after payment submitted) ─── */}
      {modalOpen && pollingStatus && (
        <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-green-dark/40 backdrop-blur-md" onClick={closeSubscribeModal} />
          <div className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] p-0 shadow-2xl overflow-hidden border border-white/20 animate-fade-in pb-[70px] md:pb-0">
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bricolage text-2xl font-black text-slate-900 tracking-tight">Paiement en cours</h2>
                <p className="text-[13px] text-slate-500 font-medium">Étape sécurisée par DocMaster Pay</p>
              </div>
              <button onClick={closeSubscribeModal} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="px-8 pb-8">
              <div className="text-center py-10 space-y-6 animate-fade-in">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <div>
                  <p className="font-bricolage text-lg font-black text-slate-800">Validation en cours...</p>
                  <p className="text-sm text-slate-500 mt-2">{pollingStatus}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cancel Confirmation Modal ─── */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-green-dark/40 backdrop-blur-sm" onClick={() => setCancelOpen(false)} />
          <div className="relative bg-white rounded-[24px] p-6 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-xl" />
            </div>
            <h3 className="font-bricolage text-xl font-bold text-textMain text-center mb-2">Annuler l'abonnement ?</h3>
            <p className="text-[13.5px] text-textMuted text-center mb-5 leading-relaxed">
              Vous conserverez votre plan actuel jusqu'à la fin de la période en cours. Aucun remboursement ne sera effectué.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCancelOpen(false)} className="flex-1 py-2.5 rounded-[12px] bg-bgMain border border-borderMain text-textMain font-bold hover:border-textMain transition-colors">
                Annuler
              </button>
              <button className="flex-1 py-2.5 rounded-[12px] bg-red-500 text-white font-bold hover:bg-red-600 transition-colors">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
