import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Badge, Loader, Modal, Paper, SimpleGrid, Text, Group, Card, RingProgress, Title, Stack } from "@mantine/core";
import { useAuth } from "../../context/AuthContext";
import { useDocuments } from "../../hooks/useDocuments";
import { useNotifications } from "../../hooks/useNotifications";
import { useDeclarations } from "../../hooks/useDeclarations";
import { useDevices } from "../../hooks/useDevices";
import { useGlobalStats, useStatsByType, useActiveDocumentTypes } from "../../hooks/useStats";
import { usePromo } from "../../hooks/usePromo";
import { useToast } from "../../context/ToastContext";
import { subscriptionsService } from "../../services/subscriptionsService";
import apiClient from "../../services/api";
import { socketService } from "../../services/socket";

import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import PromoBanner from "../../components/ui/PromoBanner";
import PromoPopup from "../../components/ui/PromoPopup";
import PollingModal from "../../components/modals/PollingModal";
import type { Subscription, Declaration } from "../../types/api";

const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

function greeting(t: (key: string) => string) {
  const h = new Date().getHours();
  if (h >= 18) return t("dashboard_greeting_evening");
  if (h < 5) return t("dashboard_greeting_night");
  return t("dashboard_greeting_morning");
}

const typeLabels: Record<string, string> = { cni: "CNI", passport: "Passeport", permis: "Permis", diplome: "Diplôme", naissance: "Acte", autre: "Doc" };

function getIconForType(type?: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("cni")) return "fa-id-card";
  if (t.includes("pass")) return "fa-passport";
  if (t.includes("permis")) return "fa-car";
  if (t.includes("diplome")) return "fa-graduation-cap";
  if (t.includes("acte")) return "fa-file-invoice";
  if (t.includes("carte")) return "fa-credit-card";
  return "fa-file-lines";
}

function statusText(status?: string) {
  switch (status) {
    case "AVAILABLE": return "dashboard_status_published";
    case "SEARCHING": return "dashboard_status_active_search";
    case "MATCHED": return "dashboard_status_matched";
    case "RETURNED": return "dashboard_status_returned";
    default: return status || "dashboard_status_pending";
  }
}

function statusBadgeCls(status?: string, type?: string) {
  if (status === "MATCHED") return "bg-green-100 text-green-700";
  if (status === "RETURNED") return "bg-gray-100 text-gray-700";
  if (type === "LOST") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function timeAgo(dateString: string | undefined, t: (key: string) => string) {
  if (!dateString) return "—";
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return t("timeago_now");
  if (diff < 3600) return `${t("timeago_minutes")} ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${t("timeago_hours")} ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${t("timeago_days")} ${Math.floor(diff / 86400)}j`;
  return t("timeago_older");
}

export default function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  useTopbar(t("sidebar_dashboard"), [{ label: t("sidebar_dashboard") }]);
  const { documents: docs, loading: docsLoading } = useDocuments();
  const { notifications: notifs, loading: notifsLoading, unreadCount, fetch: fetchNotifs } = useNotifications();
  const { declarations, loading: declsLoading } = useDeclarations();
  const { devices, loading: devLoading } = useDevices();
  const { stats: globalStats, loading: gStatsLoading } = useGlobalStats();
  const [perfPeriod, setPerfPeriod] = useState<string>("month");
  const { stats: perfStats, loading: perfLoading, fetch: fetchPerfStats } = useStatsByType("month");
  const { types: catalogTypes, loading: catalogLoading, error: catalogError } = useActiveDocumentTypes();
  const { promo, loading: promoLoading, subscribing, subscribe: promoSubscribe, dismiss: dismissPromo, isDismissed } = usePromo();
  const toast = useToast();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [skeletonDone, setSkeletonDone] = useState(false);
  const [selectedPerfDoc, setSelectedPerfDoc] = useState<any>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [nokashTransactionId, setNokashTransactionId] = useState<string | null>(null);
  const [pollingElapsed, setPollingElapsed] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(false);

  const handlePeriodChange = (period: string) => {
    setPerfPeriod(period);
    fetchPerfStats(period);
  };

  const loading = docsLoading || notifsLoading || declsLoading || devLoading || gStatsLoading || perfLoading;

  useEffect(() => {
    if (!socketService.connected) {
      socketService.init();
    }
  }, []);

  const manualCheck = useCallback(async () => {
    if (!nokashTransactionId) return;
    try {
      const usageRes = await subscriptionsService.getUsage();
      if (usageRes.success && usageRes.data?.subscription_id) {
        setPollingStatus(null);
        setNokashTransactionId(null);
        dismissPromo();
        toast.success("Paiement validé avec succès !");
        const subRes = await subscriptionsService.getMySubscription();
        if (subRes.success && subRes.data) setSubscription(subRes.data);
        return;
      }
      const forceRes = await apiClient.get(`payments/check/${nokashTransactionId}`);
      if (forceRes.data?.success && forceRes.data?.data?.updated) {
        setPollingStatus(null);
        setNokashTransactionId(null);
        dismissPromo();
        toast.success("Paiement validé avec succès !");
        const subRes = await subscriptionsService.getMySubscription();
        if (subRes.success && subRes.data) setSubscription(subRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [nokashTransactionId, toast, dismissPromo]);

  const manualCheckRef = useRef(manualCheck);
  manualCheckRef.current = manualCheck;

  useEffect(() => {
    let interval: any;
    if (pollingStatus && nokashTransactionId) {
      let tickCount = 0;
      interval = setInterval(() => {
        tickCount++;
        setPollingElapsed((prev) => prev + 1);
        if (tickCount % 5 === 0) manualCheckRef.current();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pollingStatus, nokashTransactionId]);

  useEffect(() => {
    subscriptionsService.getMySubscription().then((res) => {
      if (res.success && res.data) setSubscription(res.data);
    }).catch((e: any) => {
      console.error("[Dashboard] Failed to load subscription:", e?.response?.data || e);
    });
    subscriptionsService.getUsage().then((res) => {
      if (res.success && res.data) setUsage(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setSkeletonDone(true), 200);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handlePromoSubscribe = async (method: "orange" | "mtn" | "points", phone: string) => {
    let paymentMethod = "";
    if (method === "orange") paymentMethod = "ORANGE_MONEY";
    else if (method === "mtn") paymentMethod = "MTN_MOMO";
    else paymentMethod = "POINTS";

    setProcessingPayment(true);
    try {
      const res = await promoSubscribe(paymentMethod, phone);
      const paymentData = res?.data;
      const txId = paymentData?.transactionId;
      if (paymentData?.status === 'PENDING_PAYMENT' && txId) {
        setNokashTransactionId(txId);
        setPollingStatus("Veuillez valider le paiement sur votre téléphone");
        setPollingElapsed(0);
        setProcessingPayment(false);
      } else {
        setProcessingPayment(false);
        dismissPromo();
        toast.success("Félicitations ! Votre abonnement VIP est actif.");
      }
    } catch (err: any) {
      setProcessingPayment(false);
      const msg = err.response?.data?.message || err.message || "Erreur lors de l'activation de l'offre";
      toast.error(msg);
    }
  };

  const docCount = docs.length;
  const lostCount = docs.filter((d) => d.is_lost).length || 0;
  const verifiedCount = docs.filter((d) => d.is_verified).length || 0;
  const newCount = Math.max(0, docCount - verifiedCount - lostCount);
  const activeDecls = declarations.filter((d: Declaration) => !["RETURNED", "CANCELLED", "CLAIMED"].includes(d.status));

  const planName = subscription?.plan_name || usage?.plan_name || "Standard";
  const docLimit = subscription?.doc_limit || usage?.doc_limit || 5;
  const docCountSub = subscription?.doc_count || usage?.doc_count || docCount;
  const quotaPct = Math.min((docCountSub / docLimit) * 100, 100);
  const daysRemaining = usage?.days_remaining ?? null;
  const daysTotal = usage?.days_total ?? null;
  const daysUsed = usage?.days_used ?? 0;
  const daysProgress = daysTotal && daysTotal > 0 ? Math.min((daysUsed / daysTotal) * 100, 100) : 0;

  const perfData = Array.isArray(perfStats) ? perfStats : [];

  const donutTotal = docCount || 1;
  const donutSegments = [
    { count: verifiedCount, color: "#10B981" },
    { count: lostCount, color: "#E8923A" },
    { count: newCount, color: "#7C3AED" },
  ].filter((s) => s.count > 0);

  if (!skeletonDone && loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] pt-[88px] md:pt-6 px-4">
        <Loader color="gold" size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      <div className="p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 h-full overflow-hidden">

        {/* Greeting */}
        <Group justify="space-between" wrap="wrap" gap="sm">
          <div>
            <Title order={1} fz={{ base: 20, sm: 24 }} className="font-bricolage">
              {greeting(t)}, <span>{user?.prenom || t("dashboard_user")}</span>
            </Title>
            <Text size="sm" c="dimmed" mt={2} fs="italic">
              {t("dashboard_activity_overview")}
            </Text>
          </div>
          <Group gap="xs">
            <Paper withBorder p="xs" radius="md" style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
              <i className="fa-regular fa-calendar text-primary text-sm" />
              <Text size="sm" c="dimmed">{today}</Text>
            </Paper>
          </Group>
        </Group>

        {promo && !isDismissed && (
          <div className="min-w-0">
            <PromoBanner
              plan={promo}
              onSubscribe={handlePromoSubscribe}
              onDismiss={dismissPromo}
              processing={processingPayment || subscribing}
              pollingStatus={pollingStatus}
            />
          </div>
        )}

        {/* Stat cards */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">{t("dashboard_badge_my_docs")}</Text>
              <i className="fa-solid fa-file-circle-xmark text-amber-500 text-xl" />
            </Group>
            <Text fz={28} fw={800} mt="sm" className="font-bricolage">{lostCount}</Text>
            <Text size="xs" c="dimmed" mt={4}>{t("dashboard_label_declared_docs")}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md" onClick={() => navigate("/mes-appareils")} style={{ cursor: "pointer" }}>
            <Group justify="space-between">
              <Badge size="sm" variant="light">{t("sidebar_devices")}</Badge>
              <i className="fa-solid fa-mobile-screen-button text-blue-600 text-xl" />
            </Group>
            <Text fz={28} fw={800} mt="sm" className="font-bricolage">{devices.length}</Text>
            <Text size="xs" c="dimmed" mt={4}>{t("dashboard_label_devices")}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">{t("dashboard_badge_platform")}</Text>
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-xl" />
            </Group>
            <Text fz={28} fw={800} mt="sm" className="font-bricolage">{globalStats?.total_lost ?? "—"}</Text>
            <Text size="xs" c="dimmed" mt={4}>{t("dashboard_label_global_lost")}</Text>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">{t("dashboard_badge_platform")}</Text>
              <i className="fa-solid fa-hand-holding-heart text-purple-600 text-xl" />
            </Group>
            <Text fz={28} fw={800} mt="sm" className="font-bricolage">{globalStats?.total_recovered ?? "—"}</Text>
            <Text size="xs" c="dimmed" mt={4}>{t("dashboard_label_global_recovered")}</Text>
          </Paper>
        </SimpleGrid>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] gap-3 sm:gap-4 items-start">
          {/* Left */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Tracking */}
            <div className="flex flex-col gap-4" id="trackingContainer">
              {activeDecls.length === 0 ? (
                <Paper withBorder p="xl" ta="center" style={{ borderStyle: "dashed" }}>
                  <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-folder-open text-textMuted text-2xl" />
                  </div>
                  <Title order={3} className="font-bricolage">{t("dashboard_no_activity")}</Title>
                  <Text size="sm" c="dimmed" mt="xs">{t("dashboard_no_activity_desc")}</Text>
                  <Group justify="center" mt="lg">
                    <Button onClick={() => navigate("/declarer")} color="gold" size="sm">{t("dashboard_declare_loss")}</Button>
                    <Button onClick={() => navigate("/trouver")} variant="default" size="sm">{t("dashboard_report_found")}</Button>
                  </Group>
                </Paper>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {activeDecls.map((decl: Declaration) => (
                    <DeclCard key={decl.id} decl={decl} navigate={navigate} userName={user?.prenom} t={t} />
                  ))}
                </div>
              )}
            </div>

            {/* Recent activities */}
            <Card withBorder radius="md" padding={0}>
              <Group justify="space-between" px="md" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
                <Group gap="xs">
                  <i className="fa-solid fa-clock-rotate-left text-primary text-sm" />
                  <Text fw={700} className="font-bricolage">{t("dashboard_recent_activities")}</Text>
                </Group>
                <Text size="xs" fw={600} c="gold" style={{ cursor: "pointer" }}>
                  {t("dashboard_see_all")} <i className="fa-solid fa-arrow-right text-[9px]" />
                </Text>
              </Group>
              <div>
                {activeDecls.slice(0, 2).map((decl: any) => {
                  const dateStr = decl.created_at ? new Date(decl.created_at).toLocaleDateString("fr-FR") : "—";
                  const isLost = decl.declaration_type === "LOST";
                  return (
                    <Group key={decl.id} gap="sm" px="md" py="sm" style={{ cursor: "pointer" }}>
                      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-sm flex-shrink-0`}>
                        <i className={`fa-solid ${getIconForType(decl.doc_type)} ${isLost ? "text-primary-dark" : "text-blue-500"}`} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>
                          {decl.docTypeInfo?.nom || decl.doc_type || t("dashboard_document")} {isLost ? t("dashboard_lost") : t("dashboard_found")}
                        </Text>
                        <Text size="xs" c="dimmed" fs="italic">
                          <i className="fa-solid fa-location-dot" style={{ fontSize: 9 }} /> {decl.ville || t("dashboard_not_specified")} · <i className="fa-regular fa-clock" style={{ fontSize: 9 }} /> {dateStr}
                        </Text>
                      </div>
                      <Badge color={decl.status === "MATCHED" ? "green" : decl.status === "RETURNED" ? "gray" : decl.declaration_type === "LOST" ? "orange" : "blue"} size="sm" variant="light">
                        {t(statusText(decl.status))}
                      </Badge>
                    </Group>
                  );
                })}
                {activeDecls.length === 0 && (
                  <Text ta="center" p="md" size="xs" c="dimmed" fs="italic">{t("dashboard_no_recent_activity")}</Text>
                )}
              </div>
            </Card>

            {/* Global doc stats */}
            <div className="mt-2">
              <Group justify="space-between" mb="md" px={4}>
                <div>
                  <Title order={2} className="font-bricolage" fz={{ base: 16, sm: 18 }}>{t("dashboard_performance_title")}</Title>
                  <Text size="xs" c="dimmed" fs="italic">{t("dashboard_performance_desc")}</Text>
                </div>
                <Group gap="xs">
                  {(["day", "week", "month", "year"] as const).map((p) => (
                    <Button
                      key={p}
                      size="compact-xs"
                      variant={perfPeriod === p ? "filled" : "subtle"}
                      color={perfPeriod === p ? "gold" : "gray"}
                      onClick={() => handlePeriodChange(p)}
                    >
                      {t(`dashboard_period_${p}`)}
                    </Button>
                  ))}
                  <Text size="xs" fw={700} c="gold" style={{ cursor: "pointer" }} onClick={() => setCatalogOpen(true)}>
                    {t("dashboard_full_catalog")} <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
                  </Text>
                </Group>
              </Group>
              <SimpleGrid cols={{ base: 2, md: 3, xl: 4 }} spacing="sm">
                {Array.isArray(perfData) && perfData.length > 0 ? (
                  perfData.slice(0, 8).map((doc: any, idx: number) => (
                    <PerfCard key={doc.name || idx} doc={doc} onClick={() => setSelectedPerfDoc(doc)} period={perfPeriod} />
                  ))
                ) : (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                )}
              </SimpleGrid>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Donut */}
            <Card withBorder radius="md" padding={0}>
              <Group px="md" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }} gap="xs">
                <i className="fa-solid fa-chart-pie text-primary text-sm" />
                <Text fw={700} className="font-bricolage">{t("dashboard_doc_stats")}</Text>
              </Group>
              <Stack align="center" p="md" gap="md">
                <RingProgress
                  size={140}
                  thickness={14}
                  roundCaps
                  sections={[
                    { value: (verifiedCount / donutTotal) * 100, color: "#10B981" },
                    { value: (lostCount / donutTotal) * 100, color: "#E8923A" },
                    { value: (newCount / donutTotal) * 100, color: "#7C3AED" },
                  ]}
                  label={
                    <Text ta="center" fz={26} fw={800} className="font-bricolage">
                      {docCount}
                    </Text>
                  }
                />
                <Stack gap="xs" w="100%">
                  {verifiedCount > 0 && <DonutRow color="#10B981" label={t("dashboard_donut_recovered")} value={verifiedCount} />}
                  {lostCount > 0 && <DonutRow color="#E8923A" label={t("dashboard_donut_in_progress")} value={lostCount} />}
                  {newCount > 0 && <DonutRow color="#7C3AED" label={t("dashboard_donut_new")} value={newCount} />}
                </Stack>
              </Stack>
            </Card>

            {/* Notifications */}
            <Card withBorder radius="md" padding={0}>
              <Group justify="space-between" px="md" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
                <Group gap="xs">
                  <i className="fa-solid fa-bell text-primary text-sm" />
                  <Text fw={700} className="font-bricolage">{t("dashboard_notifications")}</Text>
                </Group>
                <Button onClick={() => (window as any).__openNotifModal?.()} variant="subtle" color="gold" size="compact-sm" rightSection={<i className="fa-solid fa-arrow-right text-[9px]" />}>
                  {t("dashboard_see_all")}
                </Button>
              </Group>
              <div>
                {notifs.length > 0 ? notifs.slice(0, 2).map((n, i) => (
                  <Group key={n.id || i} gap="sm" px="md" py="sm" style={{ borderBottom: i < Math.min(notifs.length, 2) - 1 ? "1px solid var(--mantine-color-default-border)" : "none" }}>
                    {!n.is_read && !n.lue && <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: "#E8923A" }} />}
                    <div className="w-9 h-9 rounded-[9px] flex items-center justify-center text-sm flex-shrink-0"><i className={`fa-solid ${n.icon || "fa-bell"} text-green-dark`} /></div>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fs="italic"><strong>{n.titre || ""}</strong> {n.message}</Text>
                      <Text size="xs" c="dimmed" fs="italic" mt={2}>{timeAgo(n.created_at, t)}</Text>
                    </div>
                  </Group>
                )) : (
                  <Text ta="center" p="md" size="xs" c="dimmed" fs="italic">{t("dashboard_no_notifications")}</Text>
                )}
              </div>
            </Card>

            {/* Plan card */}
            <Card withBorder radius="md" p="lg" style={{ background: "#2D5A42", borderColor: "#2A4A3A", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(217,138,48,0.06)", bottom: -48, right: -40, pointerEvents: "none" }} />
              <Group gap="xs" style={{ background: "rgba(217,138,48,0.15)", border: "1px solid rgba(217,138,48,0.25)", borderRadius: 999, padding: "4px 10px", display: "inline-flex", marginBottom: 12 }}>
                <i className="fa-solid fa-star text-primary" style={{ fontSize: 9 }} />
                <Text size="xs" fw={700} c="gold" tt="uppercase" style={{ letterSpacing: "0.05em" }}>{t("dashboard_current_plan")}</Text>
              </Group>
              <Text fz={18} fw={800} c="white" mb={4} className="font-bricolage">{planName}</Text>
              <Text size="sm" c="dimmed" mb="md">{docLimit} {t("dashboard_plan_details")}</Text>
              <div style={{ marginBottom: 14 }}>
                <Group justify="space-between" mb={6}>
                  <Text size="sm" c="white" opacity={0.6}>{t("dashboard_quota_used")}</Text>
                  <Text size="sm" fw={700} c="gold">{docCountSub} / {docLimit}</Text>
                </Group>
                <div style={{ height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#E8923A", borderRadius: 999, boxShadow: "0 0 8px rgba(217,138,48,0.4)", width: `${quotaPct}%` }} />
                </div>
              </div>
              {daysRemaining != null && daysTotal != null && (
                <div style={{ marginBottom: 14 }}>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" c="white" opacity={0.6}>{daysTotal <= 31 ? "Cycle mensuel" : "Durée abonnement"}</Text>
                    <Text size="sm" fw={700} c="gold">{daysRemaining}j / {daysTotal}j</Text>
                  </Group>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: daysRemaining <= 3 ? "#ef4444" : "#E8923A", borderRadius: 999, boxShadow: "0 0 8px rgba(217,138,48,0.4)", width: `${daysProgress}%` }} />
                  </div>
                </div>
              )}
              <Stack gap="xs" mb="md" style={{ position: "relative", zIndex: 10 }}>
                <FeatureRow icon="fa-solid fa-check" text={t("dashboard_feature_sms")} color="text-primary" />
                <FeatureRow icon="fa-solid fa-check" text={t("dashboard_feature_tracking")} color="text-primary" />
                <FeatureRow icon="fa-solid fa-lock" text={t("dashboard_feature_geo")} color="text-white/30" muted />
              </Stack>
              <Button onClick={() => navigate("/abonnement")} color="gold" fullWidth leftSection={<i className="fa-solid fa-rocket" />}>
                {t("dashboard_upgrade_plan")}
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {selectedPerfDoc && (
        <PerfModal
          doc={selectedPerfDoc}
          onClose={() => setSelectedPerfDoc(null)}
          promo={promo}
          isDismissed={isDismissed}
          onPromoSubscribe={handlePromoSubscribe}
          onPromoDismiss={dismissPromo}
          promoProcessing={processingPayment || subscribing}
          pollingStatus={pollingStatus}
        />
      )}

      {catalogOpen && (
        <CatalogModal
          types={catalogTypes}
          loading={catalogLoading}
          error={catalogError}
          onClose={() => setCatalogOpen(false)}
        />
      )}

      <PollingModal
        isOpen={!!pollingStatus}
        onClose={() => setPollingStatus(null)}
        pollingStatus={pollingStatus || ""}
        pollingElapsed={pollingElapsed}
        nokashTransactionId={nokashTransactionId}
        onManualCheck={manualCheck}
      />
    </div>
  );
}

/* ── Sub-components ── */

function DeclCard({ decl, navigate, userName, t }: {
  decl: Declaration;
  navigate: (path: string, opts?: any) => void;
  userName?: string;
  t: (k: string) => string;
}) {
  const isPerdu = (decl.declaration_type || (decl as any).type || "").toUpperCase() === "LOST";
  const typeBadge = isPerdu
    ? "bg-red-50 text-red-700 border-red-100"
    : "bg-green-50 text-green-700 border-green-100";
  const typeIcon = isPerdu ? "fa-triangle-exclamation" : "fa-file-circle-check";
  const typeLabel = isPerdu ? t("mesdeclarations_type_loss") : t("mesdeclarations_type_found");

  const statusCls: Record<string, string> = {
    MATCHED:  "bg-green-100 text-green-700 border-green-200 animate-pulse",
    RETURNED: "bg-gray-100 text-gray-700 border-gray-200",
    RESOLVED: "bg-green-50 text-green-700 border-green-100",
    NEW:      "bg-blue-50 text-blue-700 border-blue-100",
    EN_COURS: "bg-amber-50 text-amber-700 border-amber-100",
  };
  const statusLabel: Record<string, string> = {
    MATCHED:  t("mesdeclarations_status_match"),
    RETURNED: t("mesdeclarations_status_closed"),
    RESOLVED: t("mesdeclarations_status_resolved"),
    NEW:      t("mesdeclarations_status_new"),
    EN_COURS: t("mesdeclarations_status_pending"),
  };
  const sCls = statusCls[decl.status || ""] || "bg-amber-50 text-amber-700 border-amber-100";
  const sLabel = statusLabel[decl.status || ""] || t("mesdeclarations_status_pending");
  const docName = (decl as any).docTypeInfo?.nom || (decl as any).doc_type || t("dashboard_document");
  const fmtDate = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <article
      onClick={() => navigate("/mes-declarations")}
      className="bg-white border border-borda rounded-[18px] p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-bold text-textMuted/60 uppercase tracking-wide truncate">
            {(decl as any).identifiant_doc_dm || "DOC-DM"}
          </p>
          <h3 className="font-bricolage text-[16px] sm:text-[18px] font-bold text-gray-800 leading-tight mt-0.5 truncate">
            {docName}
          </h3>
        </div>
        <span className={`shrink-0 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full border text-[10px] sm:text-[11px] font-bold whitespace-nowrap ${typeBadge}`}>
          <i className={`fa-solid ${typeIcon} mr-0.5 sm:mr-1`} />{typeLabel}
        </span>
      </div>

      <div className="space-y-1 text-[12px] sm:text-[12.5px] text-textMuted">
        <p className="truncate"><i className="fa-regular fa-user mr-1.5 w-4 shrink-0" /> {(decl as any).nom_complet || (decl as any).owner_name || userName || t("dashboard_user")}</p>
        <p><i className="fa-regular fa-calendar mr-1.5 w-4 shrink-0" /> {fmtDate(decl.created_at)}</p>
        <p className="truncate"><i className="fa-solid fa-location-dot mr-1.5 w-4 shrink-0" /> {(decl as any).ville || (decl as any).lieu_perte || (decl as any).lieu_trouvee || "—"}</p>
      </div>

      <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2">
        <span className={`px-2 sm:px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-semibold ${sCls}`}>
          {sLabel}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); navigate("/mes-declarations"); }}
          className="px-2.5 sm:px-3 py-1.5 rounded-[8px] sm:rounded-[9px] bg-surface2 border border-borda text-[11px] sm:text-[12px] font-semibold text-textMuted/70 hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
        >
          {t("mesdeclarations_view_details")}
        </button>
      </div>

      {decl.status === "MATCHED" && isPerdu && (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/recuperer?id=${decl.id}`); }}
          className="mt-2 w-full py-2 rounded-xl bg-green-dark text-white font-bold text-xs flex items-center justify-center gap-2 animate-vibrate"
        >
          <i className="fa-solid fa-handshake" />
          {t("dashboard_recover_document")}
        </button>
      )}
    </article>
  );
}

function DonutRow({ color, label, value }: any) {
  return (
    <Group justify="space-between" style={{ fontSize: 13 }}>
      <Group gap="sm">
        <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
        <Text fw={500}>{label}</Text>
      </Group>
      <Text fw={700} className="font-bricolage">{value}</Text>
    </Group>
  );
}

function FeatureRow({ icon, text, color, muted }: any) {
  return (
    <Group gap="sm" style={{ fontSize: 12.5, color: muted ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)", fontStyle: muted ? "italic" : "normal" }}>
      <i className={`${icon} ${muted ? "" : color}`} style={{ fontSize: 11 }} />{text}
    </Group>
  );
}

const typeImages: Record<string, string> = {
  CNI: "/src/assets/images/cni-poubelle.jpeg",
  PASSPORT: "/src/assets/images/passport.png",
  PERMIS: "/src/assets/images/permis.jpg",
  DIPLOME: "/src/assets/images/bacc.png",
  CARTE_BLUE: "/src/assets/images/1.png",
  CARTE_GRISE: "/src/assets/images/docmaster.png",
};

const typeConfigs: Record<string, { icon: string; color: string; label: string }> = {
  CNI: { icon: "fa-id-card", color: "bg-orange-50 text-orange-600", label: "dashboard_label_cni" },
  PASSPORT: { icon: "fa-passport", color: "bg-blue-50 text-blue-600", label: "dashboard_label_passeport" },
  PERMIS: { icon: "fa-car", color: "bg-green-50 text-green-600", label: "dashboard_label_permis" },
  DIPLOME: { icon: "fa-graduation-cap", color: "bg-purple-50 text-purple-600", label: "dashboard_label_diplome" },
  CARTE_BLUE: { icon: "fa-credit-card", color: "bg-indigo-50 text-indigo-600", label: "dashboard_label_doc" },
  CARTE_GRISE: { icon: "fa-file-invoice", color: "bg-red-50 text-red-600", label: "dashboard_label_carte_grise" },
  CARTE_SEJOUR: { icon: "fa-passport", color: "bg-cyan-50 text-cyan-600", label: "dashboard_label_doc" },
  CARTE_VOTE: { icon: "fa-check-to-slot", color: "bg-lime-50 text-lime-600", label: "dashboard_label_doc" },
  ACTE_NAISSANCE: { icon: "fa-file-circle-plus", color: "bg-teal-50 text-teal-600", label: "dashboard_label_acte" },
  ACTE_MARIAGE: { icon: "fa-ring", color: "bg-pink-50 text-pink-600", label: "dashboard_label_acte" },
  ACTE_DECES: { icon: "fa-scroll", color: "bg-stone-100 text-stone-600", label: "dashboard_label_acte" },
  TITRE_FINANCIER: { icon: "fa-house-chimney", color: "bg-amber-50 text-amber-600", label: "dashboard_label_doc" },
  AUTRES: { icon: "fa-circle-question", color: "bg-gray-50 text-gray-600", label: "dashboard_label_doc" },
  DEFAULT: { icon: "fa-file-lines", color: "bg-gray-50 text-gray-600", label: "dashboard_label_doc" },
};

function PerfCard({ doc, onClick, period }: { doc: any; onClick?: () => void; period?: string }) {
  const { t } = useI18n();
  const code = doc.code || "DEFAULT";
  const cfg = typeConfigs[code] || typeConfigs.DEFAULT;
  const trend = parseFloat(doc.trend) || 0;
  const isUp = trend >= 0;
  const total = parseInt(doc.total) || 0;
  const lost = parseInt(doc.lost) || 0;
  const found = parseInt(doc.found) || 0;

  const latest = doc.recent_items?.[0];
  const activityText = latest ? `${latest.type === "LOST" ? t("dashboard_perf_lost") : t("dashboard_perf_found")} ${timeAgo(latest.date, t)}${latest.ville ? ` ${t("dashboard_perf_in")} ${latest.ville}` : ""}` : t("dashboard_perf_no_activity");

  return (
    <Card withBorder radius="lg" padding={0} onClick={onClick} style={{ cursor: "pointer" }}>
      <Card.Section>
        <div style={{ position: "relative", height: 96, overflow: "hidden", background: "var(--mantine-color-surface2)" }}>
          <img src={typeImages[code] || "/src/assets/images/devices_docs.png"} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} alt={doc.name} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)", opacity: 0.6 }} />
          <Paper style={{ position: "absolute", top: 8, right: 8, padding: "2px 6px", borderRadius: 6, background: "rgba(255,255,255,0.9)", fontSize: 9, fontWeight: 700, color: isUp ? "#16a34a" : "#ef4444", display: "flex", alignItems: "center", gap: 2 }}>
            <i className={`fa-solid ${isUp ? "fa-arrow-up" : "fa-arrow-down"}`} style={{ fontSize: 7 }} /> {Math.abs(trend)}%
          </Paper>
        </div>
      </Card.Section>
      <div style={{ padding: 12 }}>
        <Group gap="sm" mb={4}>
          <div className={`w-6 h-6 rounded-md ${cfg.color} flex items-center justify-center`} style={{ fontSize: 10 }}>
            <i className={`fa-solid ${cfg.icon}`} />
          </div>
          <Text size="xs" fw={700} truncate>{doc.name || t(cfg.label)}</Text>
        </Group>
        <div>
          <Group gap={4} align="baseline">
            <Text span fz={13} fw={800} c="gold">{total.toLocaleString()}</Text>
            <Text span size="xs" c="dimmed" fs="italic">{t(`dashboard_this_${period || "month"}`)}</Text>
          </Group>
          <Group gap={6} mt={4}>
            <Paper style={{ fontSize: 8, color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: 6, width: "fit-content" }}>
              <i className="fa-solid fa-arrow-down" style={{ fontSize: 7, marginRight: 3 }} /> {lost} {t("dashboard_perf_lost")}
            </Paper>
            <Paper style={{ fontSize: 8, color: "#16a34a", background: "#dcfce7", padding: "2px 6px", borderRadius: 6, width: "fit-content" }}>
              <i className="fa-solid fa-arrow-up" style={{ fontSize: 7, marginRight: 3 }} /> {found} {t("dashboard_perf_found")}
            </Paper>
          </Group>
          <Paper style={{ fontSize: 8, color: "var(--mantine-color-dimmed)", marginTop: 4, background: "var(--mantine-color-surface2)", padding: "2px 6px", borderRadius: 6, width: "fit-content" }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 7, marginRight: 4 }} /> {activityText}
          </Paper>
        </div>
        <div style={{ marginTop: 8, width: "100%", height: 4, background: "var(--mantine-color-surface2)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "rgba(217,138,48,0.3)", borderRadius: 999, width: `${Math.min(100, (total / 1000) * 100)}%` }} />
        </div>
      </div>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card withBorder radius="lg" p="md">
      <div className="animate-pulse">
        <div style={{ height: 16, background: "var(--mantine-color-bgMain)", borderRadius: 4, width: "75%", marginBottom: 12 }} />
        <div style={{ height: 12, background: "var(--mantine-color-bgMain)", borderRadius: 4, width: "50%" }} />
      </div>
    </Card>
  );
}

function PerfModal({ doc, onClose, promo, isDismissed, onPromoSubscribe, onPromoDismiss, promoProcessing, pollingStatus }: {
  doc: any;
  onClose: () => void;
  promo: any;
  isDismissed: boolean;
  onPromoSubscribe: (method: "orange" | "mtn" | "points", phone: string) => Promise<void>;
  onPromoDismiss: () => void;
  promoProcessing: boolean;
  pollingStatus: string | null;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const code = doc.code || "DEFAULT";
  const cfg = typeConfigs[code] || typeConfigs.DEFAULT;
  const image = typeImages[code] || "/src/assets/images/devices_docs.png";
  const trend = parseFloat(doc.trend) || 0;
  const isUp = trend >= 0;
  const recentItems = doc.recent_items || [];

  return (
    <>
      <Modal opened onClose={onClose} size="lg" padding={0} withCloseButton={false}>
        <div style={{ position: "relative", height: 176, overflow: "hidden", flexShrink: 0 }}>
          <img src={image} alt={doc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2), transparent)" }} />
          <Group style={{ position: "absolute", bottom: 12, left: 16 }} gap="sm">
            <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center`}>
              <i className={`fa-solid ${cfg.icon} text-lg`} />
            </div>
            <div>
              <Text c="white" fz={18} fw={800} className="font-bricolage">{doc.name || t(cfg.label)}</Text>
              <Badge color={isUp ? "green" : "red"} size="sm" variant="light">
                <i className={`fa-solid ${isUp ? "fa-arrow-up" : "fa-arrow-down"}`} style={{ fontSize: 8 }} /> {Math.abs(trend)}%
              </Badge>
            </div>
          </Group>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <SimpleGrid cols={3} spacing="sm">
            <Paper p="md" ta="center" style={{ background: "var(--mantine-color-surface2)" }}>
              <Text fz={20} fw={800} className="font-bricolage">{(parseInt(doc.total) || 0).toLocaleString()}</Text>
              <Text size="xs" c="dimmed" fw={500}>{t("dashboard_perf_this_month")}</Text>
            </Paper>
            <Paper p="md" ta="center" style={{ background: "var(--mantine-color-surface2)" }}>
              <Text fz={20} fw={800} className="font-bricolage">{(parseInt(doc.previous_count) || 0).toLocaleString()}</Text>
              <Text size="xs" c="dimmed" fw={500}>{t("dashboard_perf_last_month")}</Text>
            </Paper>
            <Paper p="md" ta="center" style={{ background: "var(--mantine-color-surface2)" }}>
              <Text fz={20} fw={800} className="font-bricolage" c={isUp ? "green" : trend < 0 ? "red" : undefined}>
                {isUp ? "+" : ""}{trend}%
              </Text>
              <Text size="xs" c="dimmed" fw={500}>{t("dashboard_perf_trend")}</Text>
            </Paper>
          </SimpleGrid>
          <SimpleGrid cols={3} spacing="sm">
            <Paper p="md" ta="center" style={{ background: "#fef3c7" }}>
              <Text fz={18} fw={800} className="font-bricolage" c="#d97706">{(parseInt(doc.lost) || 0).toLocaleString()}</Text>
              <Text size="xs" c="dimmed" fw={500}>{t("dashboard_perf_lost")}</Text>
            </Paper>
            <Paper p="md" ta="center" style={{ background: "#dcfce7" }}>
              <Text fz={18} fw={800} className="font-bricolage" c="#16a34a">{(parseInt(doc.found) || 0).toLocaleString()}</Text>
              <Text size="xs" c="dimmed" fw={500}>{t("dashboard_perf_found")}</Text>
            </Paper>
            <Paper p="md" ta="center" style={{ background: "var(--mantine-color-surface2)" }}>
              <Text fz={18} fw={800} className="font-bricolage" c="#10B981">{(parseInt(doc.returned) || 0).toLocaleString()}</Text>
              <Text size="xs" c="dimmed" fw={500}>{t("dashboard_perf_returned")}</Text>
            </Paper>
          </SimpleGrid>

          {recentItems.length > 0 && (
            <div>
              <Group gap="xs" mb="sm">
                <i className="fa-solid fa-clock-rotate-left text-primary" style={{ fontSize: 11 }} />
                <Text fz={13} fw={700} className="font-bricolage">{t("dashboard_perf_recent")}</Text>
              </Group>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 192, overflowY: "auto" }}>
                {recentItems.slice(0, 8).map((item: any, i: number) => {
                  const isLost = item.type === "LOST";
                  const dateStr = item.date ? new Date(item.date).toLocaleDateString("fr-FR") : "";
                  return (
                    <Group key={item.id || i} gap="sm" p="sm" style={{ background: "var(--mantine-color-surface2)", borderRadius: 12 }}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isLost ? "bg-amber-100" : "bg-green-100"}`}>
                        <i className={`fa-solid ${isLost ? "fa-arrow-down text-amber-600" : "fa-arrow-up text-green-600"} text-xs`} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>
                          {isLost ? t("dashboard_perf_lost") : t("dashboard_perf_found")}
                        </Text>
                        <Text size="xs" c="dimmed" fs="italic">
                          {item.ville && <><i className="fa-solid fa-location-dot" style={{ fontSize: 8 }} /> {item.ville} · </>}
                          <i className="fa-regular fa-clock" style={{ fontSize: 8 }} /> {dateStr}
                        </Text>
                      </div>
                    </Group>
                  );
                })}
              </div>
            </div>
          )}

          {recentItems.length === 0 && (
            <Text ta="center" py="lg" size="xs" c="dimmed" fs="italic">
              <i className="fa-solid fa-inbox text-2xl" style={{ color: "#e5e7eb", display: "block", marginBottom: 8 }} /> {t("dashboard_perf_no_activity")}
            </Text>
          )}
        </div>

        <Group justify="flex-end" p="md" style={{ borderTop: "1px solid var(--mantine-color-default-border)", flexShrink: 0 }}>
          <Button onClick={() => { onClose(); navigate("/mes-declarations"); }} color="gold" size="sm" rightSection={<i className="fa-solid fa-arrow-right text-[9px]" />}>
            {t("dashboard_perf_view_all")}
          </Button>
        </Group>
      </Modal>

      {promo && !isDismissed && (
        <PromoPopup
          plan={promo}
          onSubscribe={onPromoSubscribe}
          onDismiss={onPromoDismiss}
          processing={promoProcessing}
          pollingStatus={pollingStatus}
        />
      )}
    </>
  );
}

function CatalogModal({ types, loading, error, onClose }: {
  types: any[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <Modal
      opened
      onClose={onClose}
      size="lg"
      title={
        <Group gap="sm">
          <i className="fa-solid fa-book text-primary" />
          <Text fw={700} className="font-bricolage">{t("dashboard_catalog_title")}</Text>
        </Group>
      }
    >
      <Text size="xs" c="dimmed" mb="md">{t("dashboard_catalog_desc")}</Text>

      {loading && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: 84, background: "var(--mantine-color-bgMain)", borderRadius: 12 }} />
          ))}
        </SimpleGrid>
      )}

      {!loading && error && (
        <Text ta="center" py="lg" size="xs" c="red" fs="italic">{error}</Text>
      )}

      {!loading && !error && (!Array.isArray(types) || types.length === 0) && (
        <Text ta="center" py="lg" size="xs" c="dimmed" fs="italic">
          <i className="fa-solid fa-inbox text-2xl" style={{ color: "#e5e7eb", display: "block", marginBottom: 8 }} />
          {t("dashboard_catalog_empty")}
        </Text>
      )}

      {!loading && !error && Array.isArray(types) && types.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" style={{ maxHeight: 420, overflowY: "auto" }}>
          {types.map((type: any) => {
            const code = type.code || "DEFAULT";
            const cfg = typeConfigs[code] || typeConfigs.DEFAULT;
            const boxStyle = type.color || type.bg
              ? { background: type.bg || "#f3f4f6", color: type.color || "#6b7280" }
              : undefined;
            return (
              <Card key={type.id || code} withBorder radius="md" p="sm">
                <Group gap="sm" align="flex-start" wrap="nowrap">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={boxStyle || { background: "#f3f4f6", color: "#6b7280" }}
                  >
                    <i className={`fa-solid ${cfg.icon}`} style={{ fontSize: 13 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6} wrap="nowrap">
                      <Text fz={13} fw={700} truncate>{type.nom}</Text>
                      <Badge size="xs" variant="light" color="gray">{type.code}</Badge>
                    </Group>
                    {type.description && (
                      <Text size="xs" c="dimmed" fs="italic" lineClamp={2} mt={2}>{type.description}</Text>
                    )}
                    {Number(type.prix_retrouvaille) > 0 && (
                      <Text size="xs" fw={600} mt={4} c="gold">
                        {t("dashboard_catalog_price")} : {Number(type.prix_retrouvaille).toLocaleString("fr-FR")} FCFA
                      </Text>
                    )}
                  </div>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Modal>
  );
}
