import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { subscriptionsService } from "../../services/subscriptionsService";
import { paymentsService, type SavedPaymentMethod } from "../../services/paymentsService";
import apiClient from "../../services/api";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";

import PaymentModal from "../../components/modals/PaymentModal";
import ActionSuccessModal from "../../components/modals/ActionSuccessModal";
import type { Plan, Transaction } from "../../types/api";
import { usePromo } from "../../hooks/usePromo";
import { useToast } from "../../context/ToastContext";
import PromoBanner from "../../components/ui/PromoBanner";
import PollingModal from "../../components/modals/PollingModal";
import {
  SegmentedControl,
  Card,
  Badge,
  Button,
  Paper,
  Text,
  Title,
  Group,
  Stack,
  Table,
  SimpleGrid,
  Modal,
  TextInput,
  Select,
  Loader,
  Overlay,
  RingProgress,
  Skeleton,
  Divider,
  Box,
  Alert,
} from "@mantine/core";

const METHOD_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  MTN: { icon: "fa-mobile-screen-button", color: "text-[#E8923A]", bg: "bg-[#E8923A]/10" },
  ORANGE: { icon: "fa-mobile-screen-button", color: "text-[#E8923A]", bg: "bg-[#E8923A]/10" },
  BANK: { icon: "fa-university", color: "text-blue-400", bg: "bg-blue-50" },
};

export default function Abonnement() {
  const { user } = useAuth();
  const { t } = useI18n();
  useTopbar(t("abonnement_title"), [{ label: t("abonnement_breadcrumb_home"), href: "/dashboard" }, { label: t("abonnement_breadcrumb_subscription") }]);
  const navigate = useNavigate();
  const { promo, loading: promoLoading, subscribing, subscribe: promoSubscribe, dismiss: dismissPromo, isDismissed } = usePromo();
  const toast = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [nokashTransactionId, setNokashTransactionId] = useState<string | null>(null);
  const [manualChecking, setManualChecking] = useState(false);
  const [pollingElapsed, setPollingElapsed] = useState(0);

  const [cancelOpen, setCancelOpen] = useState(false);

  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [addMethodType, setAddMethodType] = useState<"MTN" | "ORANGE" | "BANK">("MTN");

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

  const fetchMethods = useCallback(async () => {
    try {
      const res = await paymentsService.getPaymentMethods();
      if (res.success && res.data) setSavedMethods(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const startPolling = (txIdParam?: string | null, targetPlanParam?: Plan | null) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    const activeTxId = txIdParam ?? nokashTransactionId;
    const targetPlan = targetPlanParam ?? selectedPlan;
    const initialPlanName = usage?.plan_name || "";
    const startedAt = Date.now();

    pollingIntervalRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setPollingElapsed(elapsed);

      try {
        // 1. Check transaction state via Nokash check endpoint
        if (activeTxId) {
          const checkRes = await apiClient.get(`payments/check/${activeTxId}`);
          const checkData = checkRes.data?.data;
          if (
            checkRes.data?.success &&
            (checkData?.status === "SUCCESS" ||
              checkData?.currentStatus === "SUCCESS" ||
              (checkData?.updated && checkData?.status !== "FAILED"))
          ) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setPollingStatus(null);
            setPollingElapsed(0);
            dismissPromo();
            setPaySuccess(true);
            loadData();
            return;
          }
        }

        // 2. Check if subscription actually activated (plan name changed or renewal confirmed)
        const res = await subscriptionsService.getUsage();
        if (
          res.success &&
          res.data &&
          targetPlan &&
          res.data.plan_name?.toLowerCase() === targetPlan.name?.toLowerCase() &&
          res.data.plan_name?.toLowerCase() !== initialPlanName.toLowerCase()
        ) {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setPollingStatus(null);
          setPollingElapsed(0);
          dismissPromo();
          setPaySuccess(true);
          loadData();
          return;
        }

        if (elapsed > 120) {
          setPollingStatus("Le paiement est en cours de traitement. Vous recevrez une notification dès confirmation. Vous pouvez fermer cette page.");
        } else if (elapsed > 60) {
          setPollingStatus("Confirmation en cours auprès de votre opérateur... Cette opération peut prendre jusqu'à 2 minutes.");
        } else {
          setPollingStatus(t("abonnement_payment_pending"));
        }
      } catch (e: any) {
        console.error("[Abonnement] polling error:", e?.response?.data || e);
      }
    }, 5000);

    setTimeout(() => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    }, 300000);
  };

  const handlePromoSubscribe = async (method: "orange" | "mtn" | "moov" | "points", phone: string) => {
    let paymentMethod = "";
    if (method === "orange") paymentMethod = "ORANGE_MONEY";
    else if (method === "mtn") paymentMethod = "MTN_MOMO";
    else if (method === "moov") paymentMethod = "MOOV_MONEY";
    else paymentMethod = "POINTS";

    setProcessingPayment(true);
    try {
      const res = await promoSubscribe(paymentMethod, phone);
      const paymentData = res?.data;
      const txId = paymentData?.transactionId;
      if (paymentData?.status === "PENDING_PAYMENT" && txId) {
        setNokashTransactionId(txId);
        setPollingStatus("Veuillez valider le paiement sur votre téléphone");
        setPollingElapsed(0);
        setProcessingPayment(false);
        startPolling(txId, null);
      } else {
        setProcessingPayment(false);
        dismissPromo();
        setPaySuccess(true);
        loadData();
      }
    } catch (e: any) {
      setProcessingPayment(false);
      const msg = e.response?.data?.message || e.message || "Erreur lors de l'activation de l'offre";
      toast.error(msg);
    }
  };

  const openSubscribeModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setPollingStatus(null);
    setNokashTransactionId(null);
    setPollingElapsed(0);
    setPayError("");
    setPaySuccess(false);
    setModalOpen(true);
  };

  const closeSubscribeModal = () => {
    setModalOpen(false);
    setSelectedPlan(null);
    setPollingStatus(null);
    setNokashTransactionId(null);
    setPollingElapsed(0);
    setPayError("");
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
  };

  const handlePay = async (method: "orange" | "mtn" | "moov" | "points", phone: string) => {
    setProcessing(true);
    setPayError("");
    try {
      let paymentMethod = "";
      if (method === "orange") paymentMethod = "ORANGE_MONEY";
      else if (method === "mtn") paymentMethod = "MTN_MOMO";
      else if (method === "moov") paymentMethod = "MOOV_MONEY";
      else paymentMethod = "POINTS";

      const months = billingPeriod === "annual" ? 12 : 1;
      const result = await subscriptionsService.subscribe({
        planId: selectedPlan!.id,
        months,
        paymentMethod,
        phone,
      });

      setProcessing(false);

      if (result.success) {
        closeSubscribeModal();
        if (paymentMethod === "POINTS") {
          setPaySuccess(true);
          loadData();
        } else {
          const transactionId = (result as any).data?.transactionId || (result as any).transactionId || null;
          setNokashTransactionId(transactionId);
          setPollingStatus(t("abonnement_payment_pending"));
          setPollingElapsed(0);
          startPolling(transactionId, selectedPlan);
        }
      } else {
        setPayError(result.message || t("abonnement_subscribe_error"));
      }
    } catch (e: any) {
      setProcessing(false);
      const msg = e.response?.data?.message || e.response?.data?.error || t("abonnement_subscribe_error");
      setPayError(msg);
    }
  };

  const manualCheck = async () => {
    if (!nokashTransactionId) return;
    setManualChecking(true);
    try {
      const res = await apiClient.get(`payments/check/${nokashTransactionId}`);
      const checkData = res.data?.data;
      if (res.data?.success && (checkData?.updated || checkData?.status === "SUCCESS" || checkData?.currentStatus === "SUCCESS")) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setPollingStatus(null);
        setPollingElapsed(0);
        setPaySuccess(true);
        loadData();
      } else if (checkData?.status || checkData?.currentStatus) {
        setPollingStatus(`Statut actuel: ${checkData.status || checkData.currentStatus}. En attente de validation sur votre téléphone...`);
      }
    } catch (e: any) {
      console.error("[Abonnement] manual check error:", e);
    } finally {
      setManualChecking(false);
    }
  };

  const currentPlan = usage?.plan_name || t("abonnement_plan_free");
  const currentPlanObj = plans.find((p) => p.name?.toLowerCase() === currentPlan.toLowerCase());
  const percentage = usage?.percentage || 0;
  const daysRemaining = usage?.days_remaining ?? null;
  const daysTotal = usage?.days_total ?? null;
  const daysUsed = usage?.days_used ?? 0;
  const daysProgress = daysTotal && daysTotal > 0 ? Math.min((daysUsed / daysTotal) * 100, 100) : 0;
  const subscriptionEnd = usage?.subscription_end || usage?.expires_at;
  const subscriptionStart = usage?.subscription_start;
  const declarationsUsed = usage?.usage?.declarations ?? usage?.usage?.docs_per_type ?? 0;
  const hasActiveSub = Boolean(usage?.subscription_id);
  const isFreePlan = usage?.plan_name === "Gratuit" || usage?.plan_name === "free";
  const isPromoUser = user?.subscription?.plan_id === "vip_promo_2m";

  const displayedPlans = billingPeriod === "annual"
    ? plans.map((p) => ({ ...p, price: Math.round((p.price || 0) * 12 * 0.8) }))
    : plans;

  function normalizeFeatures(raw: any): { label: string; value: string; icon?: string }[] {
    if (!raw) return [];

    if (typeof raw === "object" && !Array.isArray(raw)) {
      const featureMap: Record<string, { label: string; icon: string }> = {
        objects: { label: "Objets personnels (coffre)", icon: "fa-mobile-screen" },
        docs_per_type: { label: "Déclarations actives par type", icon: "fa-file-shield" },
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
      {/* Loading Overlay */}
      {processing && (
        <>
          <Overlay zIndex={10001} color="white" opacity={0.8} />
          <div className="fixed inset-0 z-[10002] flex flex-col items-center justify-center gap-4">
            <Loader color="#E8923A" size="lg" />
            <Title order={5} c="gray" ff="Bricolage Grotesque">Traitement du paiement...</Title>
          </div>
        </>
      )}

      {paySuccess && (
        <ActionSuccessModal
          opened={paySuccess}
          onClose={() => setPaySuccess(false)}
          title="Abonnement activé !"
          description={`Votre abonnement ${selectedPlan?.name || "VIP"} est désormais actif. Vous avez accès à tous les avantages de votre formule.`}
          badgeText={selectedPlan?.name || "VIP"}
          badgeColor="green"
          icon="fa-crown"
          details={[
            { label: "Plan", value: selectedPlan?.name || "VIP" },
            { label: "Durée", value: billingPeriod === "annual" ? "12 mois (1 an)" : "1 mois" },
            { label: "Statut", value: "Actif", highlighted: true },
          ]}
          primaryAction={{
            label: "Accéder au tableau de bord",
            icon: "fa-arrow-right",
            onClick: () => {
              setPaySuccess(false);
              navigate("/dashboard");
            },
          }}
          secondaryAction={{
            label: "Gérer mon abonnement",
            onClick: () => setPaySuccess(false),
          }}
        />
      )}

      <div className="custom-scroll p-4 md:p-6 flex flex-col gap-5 pb-24 md:pb-6">

        {/* Current plan card */}
        <div className="bg-green-dark rounded-[20px] p-5 md:p-6 relative overflow-hidden shadow-2xl shadow-green-950/40 w-full">
          <div className="absolute w-40 h-40 md:w-80 md:h-80 rounded-full bg-[#E8923A]/10 -top-12 -right-12 md:-top-24 md:-right-24 blur-3xl pointer-events-none" />
          <div className="absolute w-20 h-20 md:w-40 md:h-40 rounded-full bg-white/5 bottom-0 left-12 md:left-24 blur-2xl pointer-events-none" />

          <div className="relative z-10 w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8">
            <div className="flex-1 w-full">
              <span className="inline-flex items-center gap-1.5 bg-[#E8923A]/15 text-[#E8923A] text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <i className="fa-solid fa-bolt text-[10px]" />
                {t("abonnement_current_plan").toUpperCase()}
              </span>

              <Text component="div" size="xl" c="white" ff="Bricolage Grotesque" fw={700} mb="xs">
                {loadingUsage ? <Skeleton width={160} height={28} /> : `${t("abonnement_plan")} ${currentPlan}`}
              </Text>

              <Text component="div" size="sm" c="white.6" mb="md">
                {loadingUsage ? (
                  <Skeleton width={200} height={16} />
                ) : (
                  <>
                    Quota utilisé : {usage?.usage?.objects || 0} / {usage?.limits?.objects || 0} objets
                    {daysRemaining != null && (
                      <> · Il reste <strong>{daysRemaining}</strong> jour{daysRemaining > 1 ? "s" : ""}</>
                    )}
                    {subscriptionEnd && daysRemaining == null && (
                      <> · Expire le {new Date(subscriptionEnd).toLocaleDateString("fr-FR")}</>
                    )}
                    {!subscriptionEnd && !daysRemaining && subscriptionStart && (
                      <> · Membre depuis le {new Date(subscriptionStart).toLocaleDateString("fr-FR")}</>
                    )}
                  </>
                )}
              </Text>

              {daysRemaining != null && daysTotal != null && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-white/60 mb-1.5">
                    <span>{isFreePlan ? "Cycle mensuel" : "Durée de l&apos;abonnement"}</span>
                    <span>{daysRemaining}j restants / {daysTotal}j</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${daysProgress}%`,
                        background: daysRemaining <= 3 ? "#ef4444" : "#E8923A",
                      }}
                    />
                  </div>
                </div>
              )}

              <Group gap="sm">
                <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E8923A]/20 flex items-center justify-center">
                    <i className="fa-solid fa-file-circle-check text-[#E8923A] text-sm" />
                  </div>
                  <div>
                    <Text size="sm" fw={700}  c="white">{declarationsUsed} / {usage?.limits?.docs_per_type || 0} Déclarations</Text>
                    <Text size="9px" c="gray-500" tt="uppercase" fw={600}>Active(s) / type</Text>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E8923A]/20 flex items-center justify-center">
                    <i className="fa-solid fa-box-open text-[#E8923A] text-sm" />
                  </div>
                  <div>
                    <Text size="sm" fw={700} c="white">{usage?.usage?.objects || 0} Objets</Text>
                    <Text size="9px" c="white.4" tt="uppercase" fw={600}>Sur {usage?.limits?.objects || 0}</Text>
                  </div>
                </div>
              </Group>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-2" style={{ minWidth: 160 }}>
              <RingProgress
                size={100}
                thickness={8}
                sections={[{ value: Math.min(percentage as number, 100), color: "#E8923A" }]}
                label={
                  <div className="text-center">
                    <Text fw={700} ff="Bricolage Grotesque" c="white" size="lg" ta="center">{percentage}%</Text>
                    <Text size="8px" c="white.5" tt="uppercase" ta="center" fw={600}>Quota</Text>
                  </div>
                }
              />
              <Text size="10px" c="white.5" tt="uppercase" ta="center" fw={700}>Capacité utilisée</Text>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(percentage as number, 100)}%`, background: "#E8923A" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Active subscription warning */}
        {hasActiveSub && !promo && (
          <Alert color="#E8923A" variant="light" radius="md" icon={<i className="fa-solid fa-circle-info" />}>
            <Text fw={700} size="sm">{t("abonnement_active_sub_warning_title")}</Text>
            <Text size="xs" c="dimmed" mt={2}>
              {isPromoUser
                ? t("abonnement_active_sub_warning_promo")
                : t("abonnement_active_sub_warning")}
            </Text>
          </Alert>
        )}

        {/* Promo VIP banner */}
        {promo && (
          <PromoBanner
            plan={promo}
            onSubscribe={handlePromoSubscribe}
            processing={processingPayment || subscribing}
            pollingStatus={pollingStatus}
          />
        )}

        {/* Plans */}
        <div>
          <Group justify="space-between" mb="md">
            <Title order={4} ff="Bricolage Grotesque">Choisir un plan</Title>
            <SegmentedControl
              value={billingPeriod}
              onChange={(val) => setBillingPeriod(val as "monthly" | "annual")}
              data={[
                { label: "Mensuel", value: "monthly" },
                { label: "Annuel -20%", value: "annual" },
              ]}
              radius="xl"
              size="sm"
              color="dark"
            />
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {loadingPlans ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} radius="xl" p="md" className="border border-gray-200">
                  <Skeleton height={40} width={40} radius="md" mb="sm" />
                  <Skeleton height={20} width="70%" mb="xs" />
                  <Skeleton height={14} width="40%" mb="md" />
                  <Skeleton height={36} radius="md" mb="md" />
                  <Stack gap={8}>
                    <Skeleton height={10} />
                    <Skeleton height={10} />
                    <Skeleton height={10} width="75%" />
                  </Stack>
                  <Skeleton height={40} radius="md" mt="md" />
                </Card>
              ))
            ) : (
              displayedPlans.map((plan, idx) => {
                const isFeatured = plan.popular || plan.id === currentPlan.toLowerCase() || idx === 1;
                const isCurrent = plan.name?.toLowerCase() === currentPlan.toLowerCase();
                const features = normalizeFeatures(plan.features);
                const displayPrice = plan.price || 0;

                return (
                  <Card
                    key={plan.id || idx}
                    radius="xl"
                    p="md"
                    style={{
                      background: isFeatured ? "#2D5A42" : undefined,
                      transition: "all .4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    }}
                    className={isFeatured ? "shadow-lg" : ""}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                      e.currentTarget.style.boxShadow = isFeatured
                        ? "0 25px 60px rgba(217,138,48,.45)"
                        : "0 20px 50px rgba(0,0,0,.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = "";
                    }}
                    className={!isFeatured ? "border border-gray-200" : ""}
                  >
                    {isFeatured && (
                      <div className="absolute w-40 h-40 rounded-full bg-[#E8923A]/8 -bottom-10 -right-10 pointer-events-none" />
                    )}
                    <div className="relative z-10">
                      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3" style={{ background: isFeatured ? "rgba(217,138,48,.15)" : "rgba(217,138,48,.1)" }}>
                        <i className={`fa-solid ${isFeatured ? "fa-rocket" : "fa-star"} text-[#E8923A] text-base`} />
                      </div>
                      <Text fw={700} ff="Bricolage Grotesque" size="lg" c={isFeatured ? "white" : "gray.7"}>
                        {plan.name}
                      </Text>
                      <Text size="xs" c={isFeatured ? "white.5" : "dimmed"}>
                        {isFeatured ? "Recommandé" : "Populaire"}
                      </Text>
                    </div>
                    <div className="relative z-10" style={{ margin: "20px 0" }}>
                      <Group align="baseline" gap={4}>
                        <Text fw={900} ff="Bricolage Grotesque" size="xl" c={isFeatured ? "white" : "gray.7"}>
                          {displayPrice.toLocaleString("fr-FR")}
                        </Text>
                        <Text size="sm" fw={700} c={isFeatured ? "white.5" : "dimmed"}>XAF</Text>
                      </Group>
                      <Text size="xs" c={isFeatured ? "white.5" : "dimmed"}>
                        {billingPeriod === "annual" ? "/an" : "/mois"}
                      </Text>
                    </div>
                    <Stack gap="sm" className="relative z-10" style={{ flex: 1 }}>
                      {features.map((f, fi) => (
                        <Group key={fi} gap="xs" wrap="nowrap">
                           <i className={`${featureIcon(f)} w-4 flex-shrink-0 text-[11px] text-[#E8923A]`} />
                          <Text size="sm" fw={500} c={isFeatured ? "white" : "dark"} style={{ opacity: f.value === "Non inclus" ? 0.4 : 1 }}>
                            {f.label ? (
                              <><span style={{ color: isFeatured ? "rgba(255,255,255,.6)" : undefined, opacity: 0.7 }}>{f.label} : </span></>
                            ) : null}
                            {f.value}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                    <Button
                      fullWidth
                      radius="xl"
                      size="md"
                      mt="md"
                      className="relative z-10"
                      variant={isCurrent ? "outline" : isFeatured ? "filled" : "outline"}
                      color={isFeatured ? "#E8923A" : isCurrent ? "gray" : "dark"}
                      disabled={isCurrent}
                      onClick={() => isCurrent ? null : openSubscribeModal(plan)}
                    >
                      {isCurrent ? "Plan actuel" : `Passer au ${plan.name}`}
                    </Button>
                  </Card>
                );
              })
            )}
          </SimpleGrid>
        </div>

        {/* Invoices */}
        <Paper radius="xl">
          <Group justify="space-between" px="md" py="sm" className="border-b border-gray-200">
            <Text fw={700} ff="Bricolage Grotesque" size="sm">
              <i className="fa-solid fa-receipt text-[#E8923A] text-sm mr-2" /> Historique de facturation
            </Text>
          </Group>
          {loadingTransactions ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
              <Text size="xs" c="dimmed">Chargement de vos transactions...</Text>
            </Group>
          ) : transactions.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">Aucune transaction trouvée.</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Tbody>
                {transactions.map((tx: any, i: number) => {
                  const date = tx.created_at ? new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
                  const statusColor = tx.status === "SUCCESS" ? "green" : tx.status === "PENDING" ? "orange" : "red";
                  const statusText = tx.status === "SUCCESS" ? "Payé" : tx.status === "PENDING" ? "En cours" : "Échoué";
                  return (
                    <Table.Tr key={i}>
                      <Table.Td w={40}>
                        <div className="w-9 h-9 rounded-[10px] bg-green-light flex items-center justify-center">
                          <i className={`fa-solid ${tx.type === "subscription" ? "fa-bolt" : "fa-file-invoice"} text-green-mid text-sm`} />
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>{tx.description || "Abonnement"}</Text>
                        <Text size="xs" c="dimmed" fs="italic">{date} · {tx.payment_method || tx.method || "-"}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={700}>{tx.amount || 0} XAF</Text>
                        <Badge color={statusColor} size="xs" radius="xl" variant="light">{statusText}</Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* Payment method + Cancel */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper radius="xl" className="border border-gray-200" p="md">
            <Text fw={700} ff="Bricolage Grotesque" size="sm" mb="md">
              <i className="fa-solid fa-credit-card text-[#E8923A] text-sm mr-2" /> Moyen de paiement
            </Text>
            {savedMethods.length === 0 ? (
              <Paper p="md" radius="md" className="border border-dashed border-gray-200" ta="center">
                <i className="fa-solid fa-credit-card text-2xl text-textMuted/30 mb-2 block" />
                <Text size="xs" c="dimmed">Aucun moyen de paiement enregistré</Text>
              </Paper>
            ) : (
              <Stack gap="sm" mb="md">
                {savedMethods.map((m) => {
                  const mi = METHOD_ICONS[m.method_type] || METHOD_ICONS.MTN;
                  return (
                    <Paper key={m.id} bg="gray.0" p="sm" radius="md" className="border border-gray-200">
                      <Group gap="sm">
                        <div className={`w-9 h-9 rounded-[10px] ${mi.bg} flex items-center justify-center`}>
                          <i className={`fa-solid ${mi.icon} ${mi.color} text-sm`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Text size="sm" fw={600} truncate>{m.account_name || `${m.method_type} - ${m.account_number}`}</Text>
                          <Text size="xs" c="dimmed">{m.account_number}{m.is_default ? " · Défaut" : ""}</Text>
                        </div>
                        {m.is_default && <Badge color="green" size="xs" variant="light">Actif</Badge>}
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            )}
            <Button
              fullWidth
              variant="outline"
              radius="xl"
              size="sm"
              leftSection={<i className="fa-solid fa-plus text-[11px]" />}
              onClick={() => { setAddMethodType("MTN"); setShowAddMethodModal(true); }}
            >
              Ajouter un moyen de paiement
            </Button>
          </Paper>

          <Paper radius="xl" className="border border-gray-200" p="md">
            <div>
              <Text fw={700} ff="Bricolage Grotesque" size="sm" mb="xs">
                <i className="fa-solid fa-circle-xmark text-red-400 text-sm mr-2" /> Gestion de l'abonnement
              </Text>
              <Text size="xs" c="dimmed" mb="md">
                Votre abonnement se renouvelle automatiquement. Vous pouvez l'annuler à tout moment sans frais supplémentaires.
              </Text>
            </div>
            <Stack gap="sm">
              <Button fullWidth variant="outline" radius="xl" size="sm">
                Mettre en pause
              </Button>
              <Button
                fullWidth
                variant="light"
                color="red"
                radius="xl"
                size="sm"
                onClick={() => setCancelOpen(true)}
              >
                Annuler l'abonnement
              </Button>
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Comparison table */}
        <Paper radius="xl">
          <Group px="md" py="sm" className="border-b border-gray-200">
            <Text fw={700} ff="Bricolage Grotesque" size="sm">
                <i className="fa-solid fa-table-columns text-[#E8923A] text-sm mr-2" /> Comparatif complet des plans
            </Text>
          </Group>
          <div className="overflow-x-auto">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fonctionnalité</Table.Th>
                  {plans.map((p, i) => (
                    <Table.Th key={i} ta="center" style={p.popular ? { color: "#E8923A", backgroundColor: "rgba(217,138,48,.05)" } : {}}>
                      {p.name}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {plans.length > 0 && (() => {
                  const allFeatures = plans.map((p) => normalizeFeatures(p.features));
                  const labelSet = new Set<string>();
                  allFeatures.forEach(feats => feats.forEach(f => { if(f.label) labelSet.add(f.label); }));
                  const labels = Array.from(labelSet);

                  return labels.map((label, fi) => (
                    <Table.Tr key={fi}>
                      <Table.Td fw={500}>{label}</Table.Td>
                      {plans.map((plan, pi) => {
                        const feats = allFeatures[pi];
                        const f = feats.find(feat => feat.label === label);
                        const val = f ? f.value : "—";
                        const isSuccess = val === "Inclus" || val === "Instantané" || (typeof val === "string" && !isNaN(Number(val)) && Number(val) > 0);
                        const isFailure = val === "Non inclus";

                        return (
                          <Table.Td
                            key={pi}
                            ta="center"
                            fw={600}
                             style={plan.popular ? { color: "#E8923A", backgroundColor: "rgba(217,138,48,.05)" } : {}}
                          >
                            {val === "Inclus" ? (
                              <i className="fa-solid fa-check text-green-500" />
                            ) : val === "Non inclus" ? (
                              <i className="fa-solid fa-xmark text-gray-300" />
                            ) : (
                              <span style={{ opacity: isFailure ? 0.3 : 1 }}>{val}</span>
                            )}
                          </Table.Td>
                        );
                      })}
                    </Table.Tr>
                  ));
                })()}
              </Table.Tbody>
            </Table>
          </div>
        </Paper>
      </div>

      {/* Subscription Modal */}
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
          <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 relative overflow-hidden mb-5">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl" />
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl shadow-inner">
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <div>
                  <Title order={4} fw={900}>{selectedPlan?.name || "-"}</Title>
                  <Text size="10px" c="dimmed" fw={700} tt="uppercase" tracking="widest" mt={4}>Plan sélectionné</Text>
                </div>
              </div>
              <div className="text-right">
                <Title order={3} fw={900} style={{ color: "#E8923A" }}>
                  {(selectedPlan?.price || 0).toLocaleString("fr-FR")} FCFA
                </Title>
                <Text size="10px" c="dimmed" fw={700} tt="uppercase" mt={4}>Montant Total</Text>
              </div>
            </div>
            <SimpleGrid cols={2} mt="md" pt="md" style={{ borderTop: "1px solid #E2E8F0" }}>
              <Group gap="sm">
                <Paper p="xs" radius="md" className="border border-gray-200">
                  <i className="fa-solid fa-calendar-check text-xs text-gray-400" />
                </Paper>
                <div>
                  <Text size="10px" c="dimmed" fw={900} tt="uppercase">Validité</Text>
                  <Text size="sm" fw={700} tt="uppercase">
                    {billingPeriod === "annual" ? "12 MOIS" : "30 JOURS"}
                  </Text>
                </div>
              </Group>
              <Group gap="sm">
                <Paper p="xs" radius="md" className="border border-gray-200">
                  <i className="fa-solid fa-file-shield text-xs text-gray-400" />
                </Paper>
                <div>
                  <Text size="10px" c="dimmed" fw={900} tt="uppercase">Quota Docs</Text>
                  <Text size="sm" fw={700} tt="uppercase">
                    {(normalizeFeatures(selectedPlan?.features)[0]?.value ?? "-").replace(/^(\d+).*/, "$1") || "-"}
                  </Text>
                </div>
              </Group>
            </SimpleGrid>
          </div>
        </PaymentModal>
      )}

      <PollingModal
        isOpen={!!pollingStatus}
        onClose={() => { setPollingStatus(null); setNokashTransactionId(null); setPollingElapsed(0); }}
        pollingStatus={pollingStatus || ""}
        pollingElapsed={pollingElapsed}
        nokashTransactionId={nokashTransactionId}
        onManualCheck={manualCheck}
        isManualChecking={manualChecking}
      />

      {/* Cancel Confirmation Modal */}
      <Modal
        opened={cancelOpen}
        onClose={() => setCancelOpen(false)}
        centered
        radius="xl"
        size="sm"
        padding="xl"
      >
        <Stack align="center" gap="md">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <i className="fa-solid fa-triangle-exclamation text-red-500 text-xl" />
          </div>
          <Title order={4} ta="center">Annuler l'abonnement ?</Title>
          <Text size="sm" c="dimmed" ta="center">
            Vous conserverez votre plan actuel jusqu'à la fin de la période en cours. Aucun remboursement ne sera effectué.
          </Text>
          <Group grow w="100%">
            <Button variant="outline" radius="xl" onClick={() => setCancelOpen(false)}>
              Annuler
            </Button>
            <Button color="red" radius="xl">
              Confirmer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Payment Method Modal */}
      <SubscriptionAddMethodModal
        opened={showAddMethodModal}
        methodType={addMethodType}
        onClose={() => setShowAddMethodModal(false)}
        onDone={() => { setShowAddMethodModal(false); fetchMethods(); }}
        t={t}
      />
    </div>
  );
}

/* ─── Add Payment Method Modal (for Abonnement page) ─── */

function SubscriptionAddMethodModal({ opened, methodType, onClose, onDone, t }: any) {
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [validationErr, setValidationErr] = useState("");

  const typeIcon = methodType === "BANK" ? "fa-university" : "fa-mobile-screen-button";
  const typeColor = methodType === "MTN" ? "text-[#E8923A]" : methodType === "ORANGE" ? "text-[#E8923A]" : "text-blue-400";
  const typeBg = methodType === "MTN" ? "bg-[#E8923A]/10" : methodType === "ORANGE" ? "bg-[#E8923A]/10" : "bg-blue-50";
  const typeLabel = methodType === "BANK" ? "Virement bancaire" : `${methodType} Mobile Money`;

  const handleSave = async () => {
    setValidationErr("");
    if (!accountNumber) return;

    if (methodType === "MTN" || methodType === "ORANGE") {
      const { validatePhone } = await import("../../utils/phoneValidation");
      const err = validatePhone(accountNumber, methodType);
      if (err) { setValidationErr(err); return; }
    }

    setSaving(true);
    setError("");
    try {
      await paymentsService.createPaymentMethod({
        method_type: methodType,
        account_name: accountName,
        account_number: accountNumber,
        bank_name: methodType === "BANK" ? bankName : undefined,
      });
      setSuccess(true);
      setTimeout(() => onDone(), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      radius="xl"
      size="sm"
      padding="lg"
      title={
        <Group gap="sm">
          <div className={`w-9 h-9 rounded-[10px] ${typeBg} flex items-center justify-center`}>
            <i className={`fa-solid ${typeIcon} ${typeColor} text-sm`} />
          </div>
          <Text fw={700} ff="Bricolage Grotesque">{typeLabel}</Text>
        </Group>
      }
    >
      {success ? (
        <Stack align="center" py="md" gap="md">
          <div className="w-16 h-16 rounded-full bg-green-light flex items-center justify-center">
            <i className="fa-solid fa-check-circle text-green-mid text-3xl" />
          </div>
          <Text fw={700} ff="Bricolage Grotesque">Moyen de paiement enregistré</Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {(error || validationErr) && (
            <Alert color="red" icon={<i className="fa-solid fa-circle-exclamation" />} variant="light" size="sm">
              {error || validationErr}
            </Alert>
          )}
          <TextInput
            label="Nom du compte"
            placeholder="Ex: Jean Dupont"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            radius="xl"
            size="sm"
          />
          <TextInput
            label="Numéro de compte / mobile"
            placeholder={methodType === "BANK" ? "Numéro de compte" : "+237 XXXXXXXXX"}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            radius="xl"
            size="sm"
          />
          {methodType === "MTN" && <Text size="xs" c="dimmed">{t("payment_phone_mtn_hint")}</Text>}
          {methodType === "ORANGE" && <Text size="xs" c="dimmed">{t("payment_phone_orange_hint")}</Text>}
          {methodType === "BANK" && (
            <TextInput
              label="Nom de la banque"
              placeholder="Ex: Société Générale"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              radius="xl"
              size="sm"
            />
          )}
          <Button
            fullWidth
            loading={saving}
            disabled={!accountNumber}
            leftSection={<i className="fa-solid fa-floppy-disk" />}
            onClick={handleSave}
            radius="xl"
            size="md"
            style={{ backgroundColor: "#E8923A" }}
          >
            Enregistrer
          </Button>
        </Stack>
      )}
    </Modal>
  );
}
