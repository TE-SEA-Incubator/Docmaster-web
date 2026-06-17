import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDocuments } from "../../hooks/useDocuments";
import { useNotifications } from "../../hooks/useNotifications";
import { useDeclarations, useDeclarationStats } from "../../hooks/useDeclarations";
import { useDevices } from "../../hooks/useDevices";
import { useGlobalStats, usePerformanceStats } from "../../hooks/useStats";
import { subscriptionsService } from "../../services/subscriptionsService";
import { socketService } from "../../services/socket";
import Topbar from "../../layout/Topbar";
import { useI18n } from "../../context/I18nContext";
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
  const { documents: docs, loading: docsLoading } = useDocuments();
  const { notifications: notifs, loading: notifsLoading, unreadCount, fetch: fetchNotifs } = useNotifications();
  const { declarations, loading: declsLoading } = useDeclarations();
  const { devices, loading: devLoading } = useDevices();
  const { stats: globalStats, loading: gStatsLoading } = useGlobalStats();
  const { stats: perfStats, loading: perfLoading } = usePerformanceStats();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [skeletonDone, setSkeletonDone] = useState(false);
  const [selectedPerfDoc, setSelectedPerfDoc] = useState<any>(null);

  const loading = docsLoading || notifsLoading || declsLoading || devLoading || gStatsLoading || perfLoading;

  useEffect(() => {
    if (!socketService.connected) {
      socketService.init();
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      fetchNotifs();
    };
    window.addEventListener("docmaster:notification", handler);
    return () => window.removeEventListener("docmaster:notification", handler);
  }, [fetchNotifs]);

  useEffect(() => {
    subscriptionsService.getMySubscription().then((res) => {
      if (res.success && res.data) setSubscription(res.data);
    }).catch((e: any) => {
      console.error("[Dashboard] Failed to load subscription:", e?.response?.data || e);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setSkeletonDone(true), 200);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const docCount = docs.length;
  const lostCount = docs.filter((d) => d.is_lost).length || 0;
  const verifiedCount = docs.filter((d) => d.is_verified).length || 0;
  const newCount = Math.max(0, docCount - verifiedCount - lostCount);
  const activeDecls = declarations.filter((d: Declaration) => !["RETURNED", "CANCELLED", "CLAIMED"].includes(d.status));

  const planName = subscription?.plan_name || "Standard";
  const docLimit = subscription?.doc_limit || 5;
  const docCountSub = subscription?.doc_count || docCount;
  const quotaPct = Math.min((docCountSub / docLimit) * 100, 100);

  const perfData = Array.isArray(perfStats) ? perfStats : [];

  const CIRC = 2 * Math.PI * 50;
  const donutTotal = docCount || 1;
  const donutSegments = [
    { count: verifiedCount, color: "#10B981" },
    { count: lostCount, color: "#F5A64B" },
    { count: newCount, color: "#7C3AED" },
  ].filter((s) => s.count > 0);

  if (!skeletonDone && loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] pt-[88px] md:pt-6 px-4">
        <div className="w-11 h-11 rounded-full border-4 border-borda border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("sidebar_dashboard")}
        breadcrumbs={[
          { label: t("sidebar_dashboard") },
        ]}
      />

      <div className="custom-scroll p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">

        {/* Greeting */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-bricolage text-xl sm:text-2xl font-extrabold text-textMain tracking-tight leading-tight">
              {greeting(t)}, <span>{user?.prenom || t("dashboard_user")}</span>
            </h1>
            <p className="text-[12.5px] sm:text-[13.5px] text-textMuted/70 font-medium mt-0.5 italic">
              {t("dashboard_activity_overview")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[11.5px] text-textMuted font-medium bg-white border border-borda px-3 py-1.5 rounded-[9px] flex items-center gap-2 whitespace-nowrap">
              <i className="fa-regular fa-calendar text-primary" />
              <span>{today}</span>
            </div>
          
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon="fa-solid fa-file-circle-xmark" iconBg="bg-amber-50" iconColor="text-amber-500" badge={t("dashboard_badge_my_docs")} badgeColor="bg-amber-100 text-amber-700" value={lostCount} label={t("dashboard_label_declared_docs")}  />
          <div onClick={() => navigate("/mes-appareils")} className="col-span-1 bg-white border border-borda rounded-[16px] sm:rounded-[18px] p-4 flex flex-col gap-2.5 hover:border-primary/50 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center text-base"><i className="fa-solid fa-mobile-screen-button text-blue-600" /></div>
              <span className="text-[10px] font-bold py-0.5 px-2 rounded-[7px] bg-blue-100 text-blue-700">{t("sidebar_devices")}</span>
            </div>
            <div className="font-bricolage text-[24px] sm:text-[28px] font-extrabold text-textMain leading-none">{devices.length}</div>
            <div className="text-[11px] sm:text-[12.5px] text-textMuted font-medium leading-tight">{t("dashboard_label_devices")}</div>
          </div>
          <StatCard icon="fa-solid fa-triangle-exclamation" iconBg="bg-red-50" iconColor="text-red-500" badge={t("dashboard_badge_platform")} badgeColor="bg-red-100 text-red-700" value={globalStats?.total_lost ?? "—"} label={t("dashboard_label_global_lost")} />
          <StatCard icon="fa-solid fa-hand-holding-heart" iconBg="bg-purple-50" iconColor="text-purple-600" badge={t("dashboard_badge_platform")} badgeColor="bg-purple-100 text-purple-700" value={globalStats?.total_recovered ?? "—"} label={t("dashboard_label_global_recovered")} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] gap-4 sm:gap-5 items-start">
          {/* Left */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Tracking */}
            <div className="flex flex-col gap-4" id="trackingContainer">
              {activeDecls.length === 0 ? (
                <div className="bg-white border border-dashed border-borda rounded-[18px] p-8 text-center">
                  <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-folder-open text-textMuted text-2xl" />
                  </div>
                  <h3 className="font-bricolage text-lg font-bold text-textMain">{t("dashboard_no_activity")}</h3>
                  <p className="text-textMuted text-sm mt-1">{t("dashboard_no_activity_desc")}</p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button onClick={() => navigate("/declarer")} className="px-4 py-2 bg-primary text-white rounded-[10px] text-xs font-bold shadow-lg shadow-primary/20">{t("dashboard_declare_loss")}</button>
                    <button onClick={() => navigate("/trouver")} className="px-4 py-2 border border-borda rounded-[10px] text-xs font-bold text-textMain hover:bg-surface2">{t("dashboard_report_found")}</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {activeDecls.map((decl: Declaration) =>
                    decl.declaration_type === "LOST" ? (
                      <TrackingLostCard key={decl.id} decl={decl} navigate={navigate} userName={user?.prenom} />
                    ) : (
                      <TrackingFoundCard key={decl.id} decl={decl} navigate={navigate} />
                    )
                  )}
                </div>
              )}
            </div>

            {/* Recent activities */}
            <div className="bg-white border border-borda rounded-[18px] overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-borda">
                <div className="font-bricolage text-[14px] sm:text-[14.5px] font-bold text-textMain flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-primary text-[12px] sm:text-[13px]" /> {t("dashboard_recent_activities")}
                </div>
                <span className="text-[11.5px] sm:text-[12px] font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all cursor-pointer">
                  {t("dashboard_see_all")} <i className="fa-solid fa-arrow-right text-[9px]" />
                </span>
              </div>
              <div className="flex flex-col divide-y divide-borda">
                {activeDecls.slice(0, 5).map((decl: any) => {
                  const dateStr = decl.created_at ? new Date(decl.created_at).toLocaleDateString("fr-FR") : "—";
                  const isLost = decl.declaration_type === "LOST";
                  const iconBg = isLost ? "bg-primary-light" : "bg-blue-50";
                  const iconCls = isLost ? "text-primary-dark" : "text-blue-500";
                  return (
                    <div key={decl.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-surface2 transition-colors cursor-pointer">
                      <div className={`w-9 h-9 sm:w-[38px] sm:h-[38px] rounded-[10px] sm:rounded-[11px] ${iconBg} flex items-center justify-center text-sm sm:text-[15px] flex-shrink-0`}>
                        <i className={`fa-solid ${getIconForType(decl.doc_type)} ${iconCls}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] sm:text-[13.5px] font-semibold text-textMain truncate">
                          {decl.docTypeInfo?.nom || decl.doc_type || t("dashboard_document")} {isLost ? t("dashboard_lost") : t("dashboard_found")}
                        </div>
                        <div className="text-[10.5px] sm:text-[11.5px] text-textMuted flex items-center gap-1 italic">
                          <i className="fa-solid fa-location-dot text-[9px]" /> {decl.ville || t("dashboard_not_specified")} · <i className="fa-regular fa-clock text-[9px]" /> {dateStr}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusBadgeCls(decl.status, decl.declaration_type)} whitespace-nowrap`}>
                        {t(statusText(decl.status))}
                      </span>
                    </div>
                  );
                })}
                {activeDecls.length === 0 && (
                  <div className="p-5 text-center text-textMuted text-xs italic">{t("dashboard_no_recent_activity")}</div>
                )}
              </div>
            </div>

            {/* Global doc stats */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <h2 className="font-bricolage text-base sm:text-lg font-extrabold text-textMain tracking-tight">{t("dashboard_performance_title")}</h2>
                  <p className="text-[11px] sm:text-[12px] text-textMuted/70 font-medium italic">{t("dashboard_performance_desc")}</p>
                </div>
                <span className="text-primary text-[11px] font-bold hover:underline flex items-center gap-1 cursor-pointer">
                  {t("dashboard_full_catalog")} <i className="fa-solid fa-chevron-right text-[9px]" />
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.isArray(perfData) && perfData.length > 0 ? (
                  perfData.slice(0, 8).map((doc: any, idx: number) => (
                    <PerfCard key={doc.name || idx} doc={doc} onClick={() => setSelectedPerfDoc(doc)} />
                  ))
                ) : (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Donut */}
            <div className="bg-white border border-borda rounded-[18px] overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-borda font-bricolage text-[14px] sm:text-[14.5px] font-bold text-textMain flex items-center gap-2">
                <i className="fa-solid fa-chart-pie text-primary text-[12px] sm:text-[13px]" /> {t("dashboard_doc_stats")}
              </div>
              <div className="p-5 flex flex-col items-center gap-4">
                <div className="donut-wrap relative w-32 h-32">
                  <svg width="128" height="128" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="50" fill="none" stroke="#EAE3D8" strokeWidth="13" />
                    {donutSegments.map((seg, i) => {
                      const prevArcs = donutSegments.slice(0, i).reduce((sum, s) => sum + (s.count / donutTotal) * CIRC, 0);
                      const arc = (seg.count / donutTotal) * CIRC;
                      return (
                        <circle key={seg.color} cx="64" cy="64" r="50" fill="none" stroke={seg.color} strokeWidth="13"
                          strokeDasharray={`${arc} ${CIRC - arc}`} strokeDashoffset={-prevArcs} />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="font-bricolage text-[26px] font-extrabold text-textMain leading-none">{docCount}</div>
                    <div className="text-[10.5px] text-textMuted mt-0.5">{t("dashboard_total")}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {verifiedCount > 0 && <DonutRow color="bg-[#10B981]" label={t("dashboard_donut_recovered")} value={verifiedCount} />}
                  {lostCount > 0 && <DonutRow color="bg-primary" label={t("dashboard_donut_in_progress")} value={lostCount} />}
                  {newCount > 0 && <DonutRow color="bg-[#7C3AED]" label={t("dashboard_donut_new")} value={newCount} />}
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white border border-borda rounded-[18px] overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-borda">
                <div className="font-bricolage text-[14px] sm:text-[14.5px] font-bold text-textMain flex items-center gap-2">
                  <i className="fa-solid fa-bell text-primary text-[12px] sm:text-[13px]" /> {t("dashboard_notifications")}
                </div>
                <button onClick={() => (window as any).__openNotifModal?.()} className="text-[11.5px] font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  {t("dashboard_see_all")} <i className="fa-solid fa-arrow-right text-[9px]" />
                </button>
              </div>
              <div className="flex flex-col divide-y divide-borda">
                {notifs.length > 0 ? notifs.slice(0, 3).map((n, i) => (
                  <div key={n.id || i} className="flex gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-surface2 transition-colors cursor-pointer relative">
                    {!n.is_read && !n.lue && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                    <div className="w-9 h-9 rounded-[9px] bg-green-100 flex items-center justify-center text-sm flex-shrink-0"><i className={`fa-solid ${n.icon || "fa-bell"} text-green-700`} /></div>
                    <div>
                      <div className="text-[12px] sm:text-[12.5px] text-textMain leading-snug italic"><strong>{n.titre || ""}</strong> {n.message}</div>
                      <div className="text-[10px] sm:text-[10.5px] text-textMuted font-medium italic mt-0.5">{timeAgo(n.created_at, t)}</div>
                    </div>
                  </div>
                )) : (
                  <div className="p-5 text-center text-textMuted text-xs italic">{t("dashboard_no_notifications")}</div>
                )}
              </div>
            </div>

            {/* Plan card */}
            <div className="bg-green-dark rounded-[18px] p-5 relative overflow-hidden">
              <div className="absolute w-[200px] h-[200px] rounded-full bg-primary/6 -bottom-12 -right-10 pointer-events-none" />
              <div className="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/25 rounded-full px-2.5 py-1 mb-3">
                <i className="fa-solid fa-star text-primary text-[9px]" />
                <span className="text-[10.5px] font-bold text-primary uppercase tracking-wide">{t("dashboard_current_plan")}</span>
              </div>
              <div className="font-bricolage text-[18px] font-extrabold text-white mb-0.5">{planName}</div>
              <div className="text-[12px] text-white/50 mb-3.5">{docLimit} {t("dashboard_plan_details")}</div>
              <div className="mb-3.5">
                <div className="flex justify-between text-[11.5px] mb-1.5">
                  <span className="text-white/60">{t("dashboard_quota_used")}</span>
                  <span className="text-primary font-bold">{docCountSub} / {docLimit}</span>
                </div>
                <div className="h-[5px] bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(245,166,75,0.4)]" style={{ width: `${quotaPct}%` }} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mb-4 relative z-10">
                <FeatureRow icon="fa-solid fa-check" text={t("dashboard_feature_sms")} color="text-primary" />
                <FeatureRow icon="fa-solid fa-check" text={t("dashboard_feature_tracking")} color="text-primary" />
                <FeatureRow icon="fa-solid fa-lock" text={t("dashboard_feature_geo")} color="text-white/30" muted />
              </div>
              <button
                onClick={() => navigate("/abonnement")}
                className="w-full py-2.5 rounded-[11px] bg-primary text-white font-bricolage text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all hover:bg-primary-dark active:scale-[.98] shadow-lg shadow-primary/20 relative z-10"
              >
                <i className="fa-solid fa-rocket" /> {t("dashboard_upgrade_plan")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedPerfDoc && <PerfModal doc={selectedPerfDoc} onClose={() => setSelectedPerfDoc(null)} />}
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ icon, iconBg, iconColor, badge, badgeColor, value, label, className = "" }: any) {
  return (
    <div className={`col-span-1 bg-white border border-borda rounded-[16px] sm:rounded-[18px] p-4 flex flex-col gap-2.5 hover:border-primary/50 transition-all ${className}`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-[10px] ${iconBg} flex items-center justify-center text-base flex-shrink-0`}>
          <i className={`${icon} ${iconColor}`} />
        </div>
        <span className={`text-[10px] font-bold py-0.5 px-2 rounded-[7px] ${badgeColor}`}>{badge}</span>
      </div>
      <div className="font-bricolage text-[24px] sm:text-[28px] font-extrabold text-textMain leading-none">{value}</div>
      <div className="text-[11px] sm:text-[12.5px] text-textMuted font-medium leading-tight">{label}</div>
    </div>
  );
}

function DonutRow({ color, label, value }: any) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <div className="flex items-center gap-2 text-textMain font-medium">
        <div className={`w-2.5 h-2.5 rounded-[3px] ${color} flex-shrink-0`} />
        {label}
      </div>
      <span className="font-bricolage font-bold text-textMain">{value}</span>
    </div>
  );
}

function FeatureRow({ icon, text, color, muted }: any) {
  return (
    <div className={`flex items-center gap-2 text-[12.5px] ${muted ? "text-white/30 italic" : "text-white/70"}`}>
      <i className={`${icon} ${muted ? "" : color} text-[11px]`} />{text}
    </div>
  );
}

const stepColors: Record<string, { bg: string; border: string; light: string; text: string; faded: string; bFaded: string; line: string; fill: string }> = {
  red:    { bg: "bg-red-500", border: "border-red-500", light: "bg-red-100", text: "text-red-600", faded: "text-red-300", bFaded: "border-red-200", line: "#FECACA", fill: "#EF4444" },
  blue:   { bg: "bg-blue-500", border: "border-blue-500", light: "bg-blue-100", text: "text-blue-600", faded: "text-blue-300", bFaded: "border-blue-200", line: "#BFDBFE", fill: "#3B82F6" },
  green:  { bg: "bg-green-500", border: "border-green-500", light: "bg-green-100", text: "text-green-600", faded: "text-green-300", bFaded: "border-green-200", line: "#BBF7D0", fill: "#22C55E" },
  orange: { bg: "bg-orange-500", border: "border-orange-500", light: "bg-orange-100", text: "text-orange-600", faded: "text-orange-300", bFaded: "border-orange-200", line: "#FED7AA", fill: "#F97316" },
};

function StepIndicator({ steps, current, color: theme }: { steps: string[]; current: number; color: "red" | "blue" | "green" | "orange" }) {
  const c = stepColors[theme] || stepColors.red;
  return (
    <div className="relative flex justify-between items-start px-2 mt-4">
      <div className="absolute top-3 left-[40px] right-[40px] h-[2px]" style={{ backgroundColor: c.line }} />
      <div className="absolute top-3 left-[40px] h-[2px]" style={{ width: `${(current - 1) / (steps.length - 1) * 100}%`, backgroundColor: c.fill }} />
      {steps.map((step, i) => (
        <div key={i} className="relative z-10 flex flex-col items-center gap-1.5 min-w-[60px]">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] shadow-sm ${i < current - 1 ? `${c.bg} text-white` : i === current - 1 ? `bg-white border-2 ${c.border} ${c.text}` : `bg-white border-2 ${c.bFaded} ${c.faded}`}`}>
            {i < current - 1 ? <i className="fa-solid fa-check" /> : <i className={`fa-solid ${i === 0 ? "fa-check" : i === 1 ? "fa-search" : i === 2 ? "fa-handshake" : "fa-check-double"}`} />}
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-tighter ${i < current - 1 ? c.text : i === current - 1 ? c.text : c.faded}`}>{step}</span>
        </div>
      ))}
    </div>
  );
}

const cardPalettes: Record<string, { border: string; headerBg: string; borderB: string; text: string; bg: string; badge: string; iconBg: string; iconText: string }> = {
  red: { border: "border-red-500", headerBg: "bg-red-50/50", borderB: "border-red-100", text: "text-red-600", bg: "bg-red-500", badge: "bg-red-500", iconBg: "bg-red-50", iconText: "text-red-500" },
  orange: { border: "border-orange-500", headerBg: "bg-orange-50/50", borderB: "border-orange-100", text: "text-orange-600", bg: "bg-orange-500", badge: "bg-orange-500", iconBg: "bg-orange-50", iconText: "text-orange-500" },
  green: { border: "border-green-500", headerBg: "bg-green-50/50", borderB: "border-green-100", text: "text-green-600", bg: "bg-green-500", badge: "bg-green-500", iconBg: "bg-green-50", iconText: "text-green-500" },
  blue: { border: "border-blue-500", headerBg: "bg-blue-50/50", borderB: "border-blue-100", text: "text-blue-600", bg: "bg-blue-500", badge: "bg-blue-500", iconBg: "bg-blue-50", iconText: "text-blue-500" },
};

function TrackingLostCard({ decl, navigate, userName }: { decl: Declaration; navigate: (path: string) => void; userName?: string }) {
  const { t } = useI18n();
  const hasMatch = decl.status === "MATCHED" || decl.status === "RETURNED";
  const allMatches = (decl.matches as unknown as Array<{ status: string; found_declaration_id: string }> | undefined) || [];
  const hasPotential = !hasMatch && allMatches.some((m) => m.status === "PENDING");
  const colorKey = hasMatch ? "green" : hasPotential ? "orange" : "red";
  const c = cardPalettes[colorKey];

  let step = 1;
  if (decl.status === "SEARCHING") step = 2;
  if (decl.status === "MATCHED") step = 3;
  if (decl.status === "RETURNED") step = 4;

  const viewPotentialMatches = () => {
    const ids = allMatches.filter((m) => m.status === "PENDING").map((m) => m.found_declaration_id);
    navigate("/rechercher", { state: { potentialIds: ids } });
  };

  return (
    <div className={`bg-white border-2 ${c.border} rounded-[18px] overflow-hidden shadow-md`}>
      <div className={`px-4 sm:px-5 py-3 border-b ${c.borderB} flex items-center justify-between ${c.headerBg}`}>
        <div className={`font-bricolage text-[13px] font-bold ${c.text} flex items-center gap-2`}>
          <i className={`fa-solid ${hasMatch ? "fa-check-double animate-bounce" : hasPotential ? "fa-magnifying-glass-chart" : "fa-triangle-exclamation animate-pulse"}`} />
          {hasMatch ? t("dashboard_card_lost_matched") : hasPotential ? t("dashboard_card_lost_potential") : t("dashboard_card_lost_reported")}
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.badge} text-white uppercase tracking-wider`}>
          {decl.status === "MATCHED" ? t("dashboard_badge_matched") : decl.status === "RETURNED" ? t("dashboard_badge_returned") : hasPotential ? t("dashboard_badge_potential") : t("dashboard_badge_lost")}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-[12px] ${c.iconBg} flex items-center justify-center ${c.iconText}`}>
            <i className={`fa-solid ${getIconForType(decl.doc_type)} text-lg`} />
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-textMain">{decl.docTypeInfo?.nom || decl.doc_type || t("dashboard_document")} — {decl.nom_complet || decl.owner_name || userName || t("dashboard_user")}</div>
            <div className="text-[10px] text-textMuted italic">{t("dashboard_ref")}: {decl.identifiant_doc_dm || decl.reference || "---"} · {t(statusText(decl.status))}</div>
          </div>
        </div>
        <StepIndicator steps={[t("dashboard_step_submission"), t("dashboard_step_search"), t("dashboard_step_matching"), t("dashboard_step_recovered")]} current={step} color={colorKey} />
        {hasPotential && (
          <div className="mt-6 flex justify-end">
            <button onClick={viewPotentialMatches} className="px-4 py-2 bg-orange-500 text-white rounded-[10px] text-[11px] font-bold hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20">
              <i className="fa-solid fa-magnifying-glass-chart" /> {t("dashboard_view_matches")}
            </button>
          </div>
        )}
        {decl.status === "MATCHED" && (
          <div className="mt-6 flex justify-end">
            <button onClick={() => navigate(`/recuperer?id=${decl.id}`)} className="px-4 py-2 bg-green-600 text-white rounded-[10px] text-[11px] font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20">
              <i className="fa-solid fa-handshake" /> {t("dashboard_recover_document")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackingFoundCard({ decl, navigate }: { decl: Declaration; navigate: (path: string) => void }) {
  const { t } = useI18n();
  const colorKey = decl.status === "RETURNED" || decl.status === "MATCHED" ? "green" : "blue";
  const c = cardPalettes[colorKey];

  let step = 1;
  if (decl.status === "AVAILABLE") step = 2;
  if (decl.status === "MATCHED") step = 3;
  if (decl.status === "RETURNED") step = 4;

  const headerLabel = decl.status === "RETURNED" ? t("dashboard_card_found_returned") : decl.status === "MATCHED" ? t("dashboard_card_found_matched") : t("dashboard_card_found_reported");
  const headerIcon = decl.status === "RETURNED" ? "fa-circle-check" : decl.status === "MATCHED" ? "fa-handshake animate-bounce" : "fa-hand-holding-heart";
  const badgeLabel = decl.status === "RETURNED" ? t("dashboard_badge_returned") : decl.status === "MATCHED" ? t("dashboard_badge_to_return") : t("dashboard_badge_reported");

  return (
    <div className={`bg-white border-2 ${c.border} rounded-[18px] overflow-hidden shadow-md`}>
      <div className={`px-4 sm:px-5 py-3 border-b ${c.borderB} flex items-center justify-between ${c.headerBg}`}>
        <div className={`font-bricolage text-[13px] font-bold ${c.text} flex items-center gap-2`}>
          <i className={`fa-solid ${headerIcon}`} /> {headerLabel}
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.badge} text-white uppercase tracking-wider`}>{badgeLabel}</span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-[12px] ${c.iconBg} flex items-center justify-center ${c.iconText}`}>
            <i className={`fa-solid ${getIconForType(decl.doc_type)} text-lg`} />
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-textMain">{decl.docTypeInfo?.nom || decl.doc_type || t("dashboard_document")} — {decl.owner_name || t("dashboard_unknown")}</div>
            <div className="text-[10px] text-textMuted italic">{t("dashboard_ref")}: {decl.identifiant_doc_dm || decl.reference || "---"} · {t(statusText(decl.status))}</div>
          </div>
        </div>
        <StepIndicator steps={[t("dashboard_found_step_found"), t("dashboard_found_step_reported"), t("dashboard_found_step_owner"), t("dashboard_found_step_returned")]} current={step} color={colorKey} />
        {decl.status === "MATCHED" && decl.status !== "RETURNED" && (
          <div className="mt-6 flex justify-end">
            <button onClick={() => navigate(`/trouver?id=${decl.id}`)} className="px-4 py-2 bg-green-600 text-white rounded-[10px] text-[11px] font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20">
              <i className="fa-solid fa-hand-holding-heart" /> {t("dashboard_return_document")}
            </button>
          </div>
        )}
        {decl.status !== "MATCHED" && decl.status !== "RETURNED" && (
          <div className="mt-4 text-[11px] text-textMuted italic text-center bg-blue-50 rounded-xl py-2 px-3">
            <i className="fa-solid fa-clock-rotate-left text-blue-400 mr-1" />
            {t("dashboard_waiting_confirmation")}
          </div>
        )}
      </div>
    </div>
  );
}

const typeImages: Record<string, string> = {
  CNI: "/src/assets/images/cni-poubelle.jpeg",
  PASSPORT: "/src/assets/images/passport.png",
  PASSEPORT: "/src/assets/images/passport.png",
  "PERMIS DE CONDUIRE": "/src/assets/images/permis.jpg",
  DIPLÔME: "/src/assets/images/bacc.png",
  "CARTE BANCAIRE": "/src/assets/images/1.png",
  "CARTE GRISE": "/src/assets/images/docmaster.png",
};

const typeConfigs: Record<string, { icon: string; color: string; label: string }> = {
  CNI: { icon: "fa-id-card", color: "bg-orange-50 text-orange-600", label: "dashboard_label_cni" },
  PASSPORT: { icon: "fa-passport", color: "bg-blue-50 text-blue-600", label: "dashboard_label_passeport" },
  PASSEPORT: { icon: "fa-passport", color: "bg-blue-50 text-blue-600", label: "dashboard_label_passeport" },
  "PERMIS DE CONDUIRE": { icon: "fa-car", color: "bg-green-50 text-green-600", label: "dashboard_label_permis" },
  DIPLÔME: { icon: "fa-graduation-cap", color: "bg-purple-50 text-purple-600", label: "dashboard_label_diplome" },
  "CARTE BANCAIRE": { icon: "fa-credit-card", color: "bg-indigo-50 text-indigo-600", label: "dashboard_label_carte_bancaire" },
  "CARTE GRISE": { icon: "fa-file-invoice", color: "bg-red-50 text-red-600", label: "dashboard_label_carte_grise" },
  DEFAULT: { icon: "fa-file-lines", color: "bg-gray-50 text-gray-600", label: "dashboard_label_doc" },
};

function PerfCard({ doc, onClick }: { doc: any; onClick?: () => void }) {
  const { t } = useI18n();
  const name = (doc.name || "").toUpperCase();
  const cfg = typeConfigs[name] || typeConfigs.DEFAULT;
  const trend = parseFloat(doc.trend) || 0;
  const isUp = trend >= 0;

  const latest = doc.recent_items?.[0];
  const activityText = latest ? `${latest.type === "LOST" ? t("dashboard_perf_lost") : t("dashboard_perf_found")} ${timeAgo(latest.date, t)}${latest.ville ? ` ${t("dashboard_perf_in")} ${latest.ville}` : ""}` : t("dashboard_perf_no_activity");

  return (
    <div onClick={onClick} className="bg-white border border-borda rounded-2xl overflow-hidden hover:border-primary/50 transition-all group cursor-pointer shadow-sm">
      <div className="relative h-24 overflow-hidden bg-surface2">
        <img src={typeImages[name] || "/src/assets/images/devices_docs.png"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90" alt={doc.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
        <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[9px] font-bold flex items-center gap-0.5 ${isUp ? "text-green-600" : "text-red-500"}`}>
          <i className={`fa-solid ${isUp ? "fa-arrow-up" : "fa-arrow-down"} text-[7px]`} /> {Math.abs(trend)}%
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-6 h-6 rounded-md ${cfg.color} flex items-center justify-center text-[10px]`}>
            <i className={`fa-solid ${cfg.icon}`} />
          </div>
          <span className="text-[11px] font-bold text-textMain truncate">{t(cfg.label)}</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] font-extrabold text-primary">{(parseInt(doc.count) || 0).toLocaleString()}</span>
            <span className="text-[9px] text-textMuted font-medium italic">{t("dashboard_this_month")}</span>
          </div>
          <span className="text-[8px] text-textMuted mt-1 bg-surface2 px-1.5 py-0.5 rounded-md w-fit font-medium">
            <i className="fa-solid fa-clock-rotate-left text-[7px] mr-1" /> {activityText}
          </span>
        </div>
        <div className="mt-2 w-full h-1 bg-surface2 rounded-full overflow-hidden">
          <div className="h-full bg-primary/30 rounded-full" style={{ width: `${Math.min(100, ((parseInt(doc.count) || 0) / 1000) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white border border-borda rounded-2xl p-4 h-32">
      <div className="h-4 bg-bgMain rounded w-3/4 mb-3" />
      <div className="h-3 bg-bgMain rounded w-1/2" />
    </div>
  );
}

function PerfModal({ doc, onClose }: { doc: any; onClose: () => void }) {
  const { t } = useI18n();
  const { navigate } = useNavigate();
  const name = (doc.name || "").toUpperCase();
  const cfg = typeConfigs[name] || typeConfigs.DEFAULT;
  const image = typeImages[name] || "/src/assets/images/devices_docs.png";
  const trend = parseFloat(doc.trend) || 0;
  const isUp = trend >= 0;
  const recentItems = doc.recent_items || [];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-44 overflow-hidden flex-shrink-0">
          <img src={image} alt={doc.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
          <div className="absolute bottom-3 left-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center`}>
              <i className={`fa-solid ${cfg.icon} text-lg`} />
            </div>
            <div>
              <div className="text-white font-bricolage text-lg font-extrabold">{t(cfg.label)}</div>
              <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${isUp ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"}`}>
                <i className={`fa-solid ${isUp ? "fa-arrow-up" : "fa-arrow-down"} text-[8px]"}`} /> {Math.abs(trend)}%
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface2 rounded-xl p-3 text-center">
              <div className="font-bricolage text-xl font-extrabold text-textMain">{(parseInt(doc.count) || 0).toLocaleString()}</div>
              <div className="text-[10px] text-textMuted font-medium">{t("dashboard_perf_this_month")}</div>
            </div>
            <div className="bg-surface2 rounded-xl p-3 text-center">
              <div className="font-bricolage text-xl font-extrabold text-textMain">{(parseInt(doc.previous_count) || 0).toLocaleString()}</div>
              <div className="text-[10px] text-textMuted font-medium">{t("dashboard_perf_last_month")}</div>
            </div>
            <div className="bg-surface2 rounded-xl p-3 text-center">
              <div className={`font-bricolage text-xl font-extrabold ${isUp ? "text-green-600" : trend < 0 ? "text-red-500" : "text-textMain"}`}>
                {isUp ? "+" : ""}{trend}%
              </div>
              <div className="text-[10px] text-textMuted font-medium">{t("dashboard_perf_trend")}</div>
            </div>
          </div>

          {recentItems.length > 0 && (
            <div>
              <h4 className="font-bricolage text-[13px] font-bold text-textMain mb-2 flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-primary text-[11px]" /> {t("dashboard_perf_recent")}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentItems.slice(0, 8).map((item: any, i: number) => {
                  const isLost = item.type === "LOST";
                  const dateStr = item.date ? new Date(item.date).toLocaleDateString("fr-FR") : "";
                  return (
                    <div key={item.id || i} className="flex items-center gap-3 bg-surface2 rounded-xl px-3 py-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isLost ? "bg-amber-100" : "bg-green-100"}`}>
                        <i className={`fa-solid ${isLost ? "fa-arrow-down text-amber-600" : "fa-arrow-up text-green-600"} text-xs`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-textMain truncate">
                          {isLost ? t("dashboard_perf_lost") : t("dashboard_perf_found")}
                        </div>
                        <div className="text-[10px] text-textMuted italic flex items-center gap-1">
                          {item.ville && <><i className="fa-solid fa-location-dot text-[8px]" /> {item.ville} · </>}
                          <i className="fa-regular fa-clock text-[8px]" /> {dateStr}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recentItems.length === 0 && (
            <div className="text-center py-6 text-textMuted text-xs italic">
              <i className="fa-solid fa-inbox text-2xl text-gray-200 block mb-2" /> {t("dashboard_perf_no_activity")}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-borda p-4 flex justify-end">
          <button onClick={() => { onClose(); navigate("/mes-declarations"); }} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-2">
            {t("dashboard_perf_view_all")} <i className="fa-solid fa-arrow-right text-[9px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
