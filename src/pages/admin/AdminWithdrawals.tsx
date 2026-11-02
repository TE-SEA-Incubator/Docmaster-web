import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { useToast } from "../../context/ToastContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { statusBadgeClass } from "../../utils/statusBadge";

interface Withdrawal {
  id: string;
  user_id: string;
  user_name?: string;
  amount: number;
  status: string;
  created_at: string;
  phone?: string;
  method?: string;
}

export default function AdminWithdrawals() {
  const { t } = useI18n();
  const toast = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    adminService.getPendingWithdrawals()
      .then((data) => setWithdrawals(Array.isArray(data) ? data : []))
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    if (action === "reject" && !note.trim()) {
      toast.warning("Veuillez ajouter une note expliquant le rejet.");
      return;
    }
    setActionId(id);
    try {
      if (action === "approve") { await adminService.approveWithdrawal(id, note); }
      else { await adminService.rejectWithdrawal(id, note); }
      setWithdrawals((prev) => prev.map((w) => (w.id === id ? { ...w, status: action === "approve" ? "COMPLETED" : "REJECTED" } : w)));
      setNote("");
    } catch {} finally { setActionId(null); }
  };

  const total = withdrawals.length;
  const paginated = withdrawals.slice((page - 1) * pageSize, page * pageSize);

  if (loading) { return <LoadingSpinner />; }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{t("admin_withdrawals")}</h1>
            <InfoTooltip text="Demandes de retrait. Approuvez ou rejetez avec une note." />
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">{t("admin_withdrawals_subtitle")}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded flex flex-col min-h-0">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_amount")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_method")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_status")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_date")}</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <EmptyState icon="ph ph-hand-withdraw" message={t("admin_no_withdrawals")} colSpan={6} />
              ) : (
                paginated.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 text-[13px]">{w.user_name || w.user_id || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-900">{w.amount?.toLocaleString("fr-FR")}</span>
                      <span className="text-[11px] text-gray-400 ml-1">XAF</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">{w.method || t("admin_mobile_money")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded border ${statusBadgeClass(w.status)}`}>
                        {(w.status || "").toUpperCase() === "COMPLETED" || (w.status || "").toUpperCase() === "APPROVED" ? t("admin_approved")
                          : (w.status || "").toUpperCase() === "REJECTED" ? t("admin_rejected")
                          : t("admin_pending")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400">
                      {w.created_at ? new Date(w.created_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(w.status || "").toUpperCase() === "PENDING" && (
                        <div className="flex flex-col items-end gap-1.5">
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Note (obligatoire pour rejet)..."
                            className="w-full max-w-[200px] px-2.5 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-[#E8923A]"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAction(w.id, "approve")}
                              disabled={actionId === w.id}
                              className="text-[11px] px-3 py-1.5 rounded border bg-green-50 text-green-700 border-green-200 hover:bg-green-100 font-semibold transition-colors disabled:opacity-50"
                            >
                              {actionId === w.id ? <i className="ph ph-spinner animate-spin" /> : t("admin_approve")}
                            </button>
                            <button
                              onClick={() => handleAction(w.id, "reject")}
                              disabled={actionId === w.id}
                              className="text-[11px] px-3 py-1.5 rounded border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 font-semibold transition-colors disabled:opacity-50"
                            >
                              {t("admin_reject")}
                            </button>
                          </div>
                        </div>
                      )}
                      {(w.status === "approved" || w.status === "rejected") && (
                        <span className="text-[11px] text-gray-400 font-medium">{t("admin_processed")}</span>
                      )}
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
