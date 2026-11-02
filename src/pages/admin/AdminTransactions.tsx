import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { exportCSV } from "../../utils/csv";
import { statusBadgeClass } from "../../utils/statusBadge";

interface Transaction {
  id: string;
  user_name?: string;
  amount: number;
  payment_method?: string;
  method?: string;
  status?: string;
  created_at?: string;
}

const statusLabel = (status: string | undefined, t: (k: string) => string) => {
  const s = (status || "").toUpperCase();
  if (["SUCCESS", "COMPLETED", "PAID"].includes(s)) return t("admin_completed");
  if (s === "PENDING") return t("admin_pending");
  if (["FAILED", "CANCELED", "CANCELLED"].includes(s)) return t("admin_failed");
  return status || "—";
};

const methodIcons: Record<string, string> = {
  ORANGE_MONEY: "ph ph-device-mobile",
  MTN_MOMO: "ph ph-device-mobile",
  OM: "ph ph-device-mobile",
  MOMO: "ph ph-device-mobile",
  orange_money: "ph ph-device-mobile",
  mtn_momo: "ph ph-device-mobile",
  card: "ph ph-credit-card",
  stripe: "ph ph-stripe-logo",
  POINTS: "ph ph-coins",
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
    if (statusFilter && (tx.status || "").toUpperCase() !== statusFilter) return false;
    return true;
  });

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleExport = () => {
    exportCSV(filtered, [
      { key: "user_name", label: "Utilisateur" },
      { key: "amount", label: "Montant" },
      { key: "payment_method", label: "Méthode" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date" },
    ], "transactions");
  };

  if (loading) { return <LoadingSpinner />; }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{t("admin_transactions")}</h1>
            <InfoTooltip text="Historique complet des transactions (abonnements, récupérations, récompenses)." />
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">{t("admin_payment_history")}</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          <i className="ph ph-download text-[10px]" /> CSV
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par utilisateur..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors placeholder:text-gray-400" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] bg-white text-gray-700">
            <option value="">Tous statuts</option>
            <option value="SUCCESS">Réussi</option>
            <option value="PENDING">En attente</option>
            <option value="FAILED">Échoué</option>
          </select>
          <span className="text-[12px] text-gray-400 ml-auto">{total} transaction{total !== 1 ? "s" : ""}</span>
        </div>

        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_amount")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_method")} <InfoTooltip text="Moyen de paiement" /></th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_status")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <EmptyState icon="ph ph-credit-card" message={t("admin_no_transactions")} colSpan={5} />
              ) : (
                paginated.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 text-[13px]">{tx.user_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-900">{tx.amount?.toLocaleString("fr-FR")}</span>
                      <span className="text-[11px] text-gray-400 ml-1">XAF</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[13px] text-gray-600">
                        <i className={`${methodIcons[tx.payment_method || tx.method || ""] || "ph ph-circle"} text-gray-400 text-[11px]`} />
                        {(tx.payment_method || tx.method || "").replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${statusBadgeClass(tx.status)}`}>
                        {statusLabel(tx.status, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400">
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
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
