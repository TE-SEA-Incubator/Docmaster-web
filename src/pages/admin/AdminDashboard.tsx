import { useEffect, useState } from "react";
import { adminService } from "../../services/admin";
import { useI18n } from "../../context/I18nContext";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineController,
  BarController,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  BarController
);

interface Transaction {
  id: string;
  nom: string;
  prenom: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  usersGrowth: number;
  activeSubscriptions: number;
  subsGrowth: number;
  estimatedMonthlyRevenue: number;
  revenueGrowth: number;
  lostDocs: number;
  lostDocsGrowth: number;
  foundDocs: number;
  foundDocsGrowth: number;
  graphs: {
    monthly: { label: string; revenue: number; subscriptions: number }[];
    plans: { label: string; count: number }[];
  };
  recentTransactions: Transaction[];
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getDashboardStats()
      .then((data) => setStats(data as unknown as Stats))
      .catch((err) => {
        console.error("Dashboard Stats Error:", err);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const revenueData = {
    labels: stats?.graphs.monthly.map((m) => m.label) || [],
    datasets: [
      {
        label: t("admin_dashboard_chart_revenue"),
        data: stats?.graphs.monthly.map((m) => m.revenue) || [],
        backgroundColor: "#F5A64B",
        borderRadius: 4,
        yAxisID: "y",
      },
      {
        label: t("admin_dashboard_chart_subscriptions"),
        data: stats?.graphs.monthly.map((m) => m.subscriptions) || [],
        type: "line" as const,
        borderColor: "#1E3A2F",
        backgroundColor: "#1E3A2F",
        borderWidth: 2,
        yAxisID: "y1",
      },
    ],
  };

  const plansData = {
    labels: stats?.graphs.plans.map((p) => p.label) || [],
    datasets: [
      {
        data: stats?.graphs.plans.map((p) => p.count) || [],
        backgroundColor: ["#1E3A2F", "#F5A64B", "#639922", "#e5e7eb"],
        borderWidth: 0,
      },
    ],
  };

  const trend = (val: number) => {
    if (val > 0) return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold"><i className="fa-solid fa-arrow-up mr-1" />+{val}%</span>;
    if (val < 0) return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold"><i className="fa-solid fa-arrow-down mr-1" />{val}%</span>;
    return <span className="text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full text-[10px] font-bold">0%</span>;
  };

  const statCards = [
    { label: t("admin_dashboard_users"), value: stats?.totalUsers, growth: stats?.usersGrowth, icon: "fa-users", color: "text-blue-600", bg: "bg-blue-50", tooltip: "Nombre total d'utilisateurs inscrits sur la plateforme" },
    { label: t("admin_dashboard_subscriptions"), value: stats?.activeSubscriptions, growth: stats?.subsGrowth, icon: "fa-crown", color: "text-purple-600", bg: "bg-purple-50", tooltip: "Nombre d'abonnements actifs" },
    { label: t("admin_dashboard_revenue"), value: stats?.estimatedMonthlyRevenue, growth: stats?.revenueGrowth, icon: "fa-money-bill", color: "text-green-600", bg: "bg-green-50", isCurrency: true, tooltip: "Revenu mensuel récurrent estimé (MRR)" },
    { label: t("admin_dashboard_lost_docs"), value: stats?.lostDocs, growth: stats?.lostDocsGrowth, icon: "fa-file-circle-exclamation", color: "text-amber-600", bg: "bg-amber-50", tooltip: "Documents déclarés comme perdus" },
    { label: t("admin_dashboard_found_docs"), value: stats?.foundDocs, growth: stats?.foundDocsGrowth, icon: "fa-circle-check", color: "text-emerald-600", bg: "bg-emerald-50", tooltip: "Documents déclarés comme trouvés" },
  ];

  const statusClass = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-emerald-100 text-emerald-700";
      case "PENDING": return "bg-amber-100 text-amber-700";
      default: return "bg-red-100 text-red-700";
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <h1 className="font-bricolage text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{t("admin_dashboard_title")}</h1>
          <InfoTooltip text="Vue d'ensemble des performances de la plateforme : utilisateurs, revenus, documents déclarés." />
        </div>
        <p className="text-gray-400 text-sm font-medium mt-1">{t("admin_dashboard_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {item.label}
                <InfoTooltip text={(item as any).tooltip} />
              </span>
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                <i className={`fa-solid ${item.icon} text-sm`} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bricolage text-2xl font-black text-gray-900">
                {(item as any).isCurrency ? `${item.value?.toLocaleString("fr-FR")} XAF` : item.value?.toLocaleString("fr-FR")}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {trend(item.growth || 0)}
              <span className="text-[10px] text-gray-400 font-medium tracking-tight">{t("admin_dashboard_this_month")}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm">
          <h3 className="font-bricolage text-lg font-bold text-gray-900 mb-6">{t("admin_dashboard_revenue_chart")}</h3>
          <div className="h-[300px]">
            <Bar
              data={revenueData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top", labels: { font: { family: "Poppins", size: 11, weight: "bold" } } } },
                scales: {
                  y: { type: "linear", display: true, position: "left", grid: { color: "#f3f4f6" } },
                  y1: { type: "linear", display: true, position: "right", grid: { drawOnChartArea: false } },
                },
              }}
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm">
          <h3 className="font-bricolage text-lg font-bold text-gray-900 mb-6">{t("admin_dashboard_plans_chart")}</h3>
          <div className="h-[300px] relative">
            <Doughnut
              data={plansData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "75%",
                plugins: { legend: { position: "bottom", labels: { font: { family: "Poppins", size: 11, weight: "bold" } } } },
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
              <span className="font-bricolage text-3xl font-black text-gray-900">{stats?.activeSubscriptions || 0}</span>
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{t("admin_dashboard_subscribers")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bricolage text-lg font-bold text-gray-900">{t("admin_dashboard_recent_tx")}</h3>
          <button className="text-xs font-bold text-primary hover:text-primary-dark transition-colors px-3 py-1.5 rounded-lg bg-primary/5">{t("admin_dashboard_see_all")}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("admin_dashboard_tx_user")}</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("admin_dashboard_tx_type")}</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("admin_dashboard_tx_amount")}</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("admin_dashboard_tx_status")}</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">{t("admin_dashboard_tx_date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats?.recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500">
                        {tx.nom?.[0]}{tx.prenom?.[0]}
                      </div>
                      <span className="text-[13px] font-bold text-gray-900">{tx.nom} {tx.prenom}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${tx.type === "SUBSCRIPTION" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                      {tx.type === "SUBSCRIPTION" ? t("admin_dashboard_tx_subscription") : t("admin_dashboard_tx_document")}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[13px] font-black text-gray-900">{tx.amount.toLocaleString()} {tx.currency}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${statusClass(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-[11px] font-bold text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
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
    </div>
  );
}
