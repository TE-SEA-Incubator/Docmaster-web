import { useEffect, useState } from "react";
import { adminService } from "../../services/admin";
import { useI18n } from "../../context/I18nContext";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { getStatusColor } from "../../utils/statusColor";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, ArcElement,
  LineController, BarController,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend,
  LineController, BarController
);

interface Transaction {
  id: string; nom: string; prenom: string;
  amount: number; currency: string; status: string; type: string; created_at: string;
}

interface Stats {
  totalUsers: number; usersGrowth: number;
  activeSubscriptions: number; subsGrowth: number;
  estimatedMonthlyRevenue: number; revenueGrowth: number;
  totalSubscriptionRevenue: number; totalRecoveryFeeRevenue: number;
  lostDocs: number; lostDocsGrowth: number;
  foundDocs: number; foundDocsGrowth: number;
  graphs: {
    monthly: { label: string; revenue: number; subscriptions: number }[];
    plans: { label: string; count: number }[];
  };
  recentTransactions: Transaction[];
}

const STATUS_BADGE: Record<string, string> = {
  // Majuscules (API backend)
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  ACTIVE:    "bg-green-50 text-green-700 border-green-200",
  SUCCESS:   "bg-green-50 text-green-700 border-green-200",
  PENDING:   "bg-gray-100 text-gray-500 border-gray-200",
  FAILED:    "bg-red-50 text-red-700 border-red-200",
  REJECTED:  "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  // Minuscules (variantes)
  completed: "bg-green-50 text-green-700 border-green-200",
  active:    "bg-green-50 text-green-700 border-green-200",
  success:   "bg-green-50 text-green-700 border-green-200",
  pending:   "bg-gray-100 text-gray-500 border-gray-200",
  failed:    "bg-red-50 text-red-700 border-red-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboardStats()
      .then((data) => setStats(data as unknown as Stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const revenueData = {
    labels: stats?.graphs.monthly.map((m) => m.label) || [],
    datasets: [
      {
        label: t("admin_dashboard_chart_revenue"),
        data: stats?.graphs.monthly.map((m) => m.revenue) || [],
        backgroundColor: "#E8923A",
        borderRadius: 2,
        yAxisID: "y",
      },
      {
        label: t("admin_dashboard_chart_subscriptions"),
        data: stats?.graphs.monthly.map((m) => m.subscriptions) || [],
        type: "line" as const,
        borderColor: "#2D5A42",
        backgroundColor: "#2D5A42",
        borderWidth: 2,
        yAxisID: "y1",
      },
    ],
  };

  const plansData = {
    labels: stats?.graphs.plans.map((p) => p.label) || [],
    datasets: [{
      data: stats?.graphs.plans.map((p) => p.count) || [],
      backgroundColor: ["#2D5A42", "#E8923A", "#639922", "#e5e7eb"],
      borderWidth: 0,
    }],
  };

  const trend = (val: number) => {
    if (val > 0) return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded">
        <i className="fa-solid fa-arrow-up text-[9px]" />+{val}%
      </span>
    );
    if (val < 0) return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
        <i className="fa-solid fa-arrow-down text-[9px]" />{val}%
      </span>
    );
    return <span className="text-[11px] font-semibold text-gray-400">0%</span>;
  };

  const statCards = [
    { label: t("admin_dashboard_users"), value: stats?.totalUsers, growth: stats?.usersGrowth, icon: "fa-solid fa-users", color: "text-blue-600", bg: "bg-blue-50 border-blue-100", tooltip: "Nombre total d'utilisateurs inscrits" },
    { label: t("admin_dashboard_subscriptions"), value: stats?.activeSubscriptions, growth: stats?.subsGrowth, icon: "fa-solid fa-crown", color: "text-violet-600", bg: "bg-violet-50 border-violet-100", tooltip: "Abonnements actifs" },
    { label: t("admin_dashboard_revenue"), value: stats?.estimatedMonthlyRevenue, growth: stats?.revenueGrowth, icon: "fa-solid fa-money-bill", color: "text-green-700", bg: "bg-green-50 border-green-100", isCurrency: true, tooltip: "Revenu mensuel récurrent (MRR)" },
    { label: "Rev. abonnements", value: stats?.totalSubscriptionRevenue, icon: "fa-solid fa-credit-card", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", isCurrency: true, tooltip: "Total revenus abonnements" },
    { label: "Frais récupération", value: stats?.totalRecoveryFeeRevenue, icon: "fa-solid fa-hand-holding-dollar", color: "text-sky-700", bg: "bg-sky-50 border-sky-100", isCurrency: true, tooltip: "Total frais de déclaration payés" },
    { label: t("admin_dashboard_lost_docs"), value: stats?.lostDocs, growth: stats?.lostDocsGrowth, icon: "fa-solid fa-file-circle-exclamation", color: "text-amber-700", bg: "bg-amber-50 border-amber-100", tooltip: "Documents déclarés perdus" },
    { label: t("admin_dashboard_found_docs"), value: stats?.foundDocs, growth: stats?.foundDocsGrowth, icon: "fa-solid fa-circle-check", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", tooltip: "Documents déclarés trouvés" },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{t("admin_dashboard_title")}</h1>
            <InfoTooltip text="Vue d'ensemble des performances de la plateforme." />
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">{t("admin_dashboard_subtitle")}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {statCards.map((item, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">
                {item.label}
              </span>
              <div className={`w-7 h-7 rounded border ${item.bg} flex items-center justify-center ${item.color} shrink-0`}>
                <i className={`${item.icon} text-[11px]`} />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-1.5 truncate">
              {(item as any).isCurrency
                ? `${(item.value || 0).toLocaleString("fr-FR")}`
                : (item.value || 0).toLocaleString("fr-FR")}
              {(item as any).isCurrency && <span className="text-[11px] text-gray-400 font-medium ml-1">XAF</span>}
            </div>
            <div className="flex items-center gap-1.5">
              {trend(item.growth || 0)}
              <span className="text-[10px] text-gray-400">{t("admin_dashboard_this_month")}</span>
            </div>
            <InfoTooltip text={(item as any).tooltip} />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">{t("admin_dashboard_revenue_chart")}</h3>
          <div className="h-[220px]">
            <Bar
              data={revenueData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top", labels: { font: { family: "Poppins", size: 11 } } } },
                scales: {
                  y: { type: "linear", display: true, position: "left", grid: { color: "#f0f0f0" } },
                  y1: { type: "linear", display: true, position: "right", grid: { drawOnChartArea: false } },
                },
              }}
            />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">{t("admin_dashboard_plans_chart")}</h3>
          <div className="h-[220px] relative">
            <Doughnut
              data={plansData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "72%",
                plugins: { legend: { position: "bottom", labels: { font: { family: "Poppins", size: 11 } } } },
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-2xl font-bold text-gray-900">{stats?.activeSubscriptions || 0}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t("admin_dashboard_subscribers")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">{t("admin_dashboard_recent_tx")}</h3>
          <button className="text-[12px] font-semibold text-[#E8923A] hover:underline">{t("admin_dashboard_see_all")}</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="py-2.5 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_dashboard_tx_user")}</th>
              <th className="py-2.5 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_dashboard_tx_type")}</th>
              <th className="py-2.5 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_dashboard_tx_amount")}</th>
              <th className="py-2.5 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_dashboard_tx_status")}</th>
              <th className="py-2.5 px-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_dashboard_tx_date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats?.recentTransactions?.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500">
                      {tx.nom?.[0]}{tx.prenom?.[0]}
                    </div>
                    <span className="text-[13px] font-semibold text-gray-800">{tx.nom} {tx.prenom}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${tx.type === "SUBSCRIPTION" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-violet-50 text-violet-700 border-violet-200"}`}>
                    {tx.type === "SUBSCRIPTION" ? t("admin_dashboard_tx_subscription") : t("admin_dashboard_tx_document")}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[13px] font-bold text-gray-900">{tx.amount.toLocaleString()} <span className="text-gray-400 font-normal text-[11px]">{tx.currency}</span></span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded border ${STATUS_BADGE[tx.status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-[11px] text-gray-400">
                  {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </td>
              </tr>
            ))}
            {(!stats?.recentTransactions || stats.recentTransactions.length === 0) && (
              <EmptyState colSpan={5} icon="fa-solid fa-receipt" message={t("admin_dashboard_tx_empty")} />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
