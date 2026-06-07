import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { exportCSV } from "../../utils/csv";

interface Transaction {
  id: string;
  user_name?: string;
  amount: number;
  method?: string;
  status?: string;
  created_at?: string;
}

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200/50",
  success: "bg-emerald-50 text-emerald-600 border-emerald-200/50",
  pending: "bg-amber-50 text-amber-600 border-amber-200/50",
  failed: "bg-red-50 text-red-600 border-red-200/50",
};

const methodIcons: Record<string, string> = {
  orange_money: "fa-solid fa-mobile-screen",
  mtn_momo: "fa-solid fa-mobile-screen",
  card: "fa-solid fa-credit-card",
  stripe: "fa-brands fa-cc-stripe",
};

export default function AdminTransactions() {
  const { t } = useI18n();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    adminService
      .getAllTransactions()
      .then((data) => setTxns(data || []))
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = txns.filter((tx) => {
    const q = search.toLowerCase();
    if (q && !(tx.user_name || "").toLowerCase().includes(q)) return false;
    if (statusFilter && tx.status !== statusFilter) return false;
    return true;
  });

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleExport = () => {
    exportCSV(filtered, [
      { key: "user_name", label: "Utilisateur" },
      { key: "amount", label: "Montant" },
      { key: "method", label: "Méthode" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date" },
    ], "transactions");
  };

  if (loading) { return <LoadingSpinner />; }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_transactions")}</h1>
            <InfoTooltip text="Historique complet des transactions (abonnements, récupérations, récompenses)." />
          </div>
          <p className="text-gray-400 text-[13px] font-medium mt-1">{t("admin_payment_history")}</p>
        </div>
        <button onClick={handleExport} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-1.5">
          <i className="fa-solid fa-download text-[10px]" /> CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
            <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par utilisateur..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors placeholder:text-gray-300" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary bg-white">
            <option value="">Tous statuts</option>
            <option value="completed">Réussi</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoué</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_amount")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_method")}<InfoTooltip text="Moyen de paiement utilisé" /></th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_status")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <EmptyState icon="fa-solid fa-credit-card" message={t("admin_no_transactions")} colSpan={5} />
              ) : (
                paginated.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{tx.user_name || "—"}</td>
                    <td className="px-4 py-3.5"><span className="font-bricolage font-extrabold text-gray-900">{tx.amount?.toLocaleString("fr-FR")} <span className="text-[11px] text-gray-400">XAF</span></span></td>
                    <td className="px-4 py-3.5"><span className="flex items-center gap-2 text-gray-600"><i className={`${methodIcons[tx.method?.toLowerCase() || ""] || "fa-solid fa-circle"} text-gray-400 text-[11px]`} />{tx.method?.replace(/_/g, " ") || "—"}</span></td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusStyles[tx.status || ""] || "bg-gray-100 text-gray-400 border-gray-200"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tx.status === "completed" || tx.status === "success" ? "bg-emerald-500" : tx.status === "pending" ? "bg-amber-500" : tx.status === "failed" ? "bg-red-500" : "bg-gray-400"}`} />
                        {tx.status === "completed" || tx.status === "success" ? t("admin_completed") : tx.status === "pending" ? t("admin_pending") : tx.status === "failed" ? t("admin_failed") : tx.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-[12px]">{tx.created_at ? new Date(tx.created_at).toLocaleDateString("fr-FR") : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  );
}
