import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

interface Withdrawal {
  id: string;
  user_id: string;
  user_name?: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  phone?: string;
  method?: string;
}

export default function AdminWithdrawals() {
  const { t } = useI18n();
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
      alert("Veuillez ajouter une note expliquant le rejet.");
      return;
    }
    setActionId(id);
    try {
      if (action === "approve") { await adminService.approveWithdrawal(id, note); }
      else { await adminService.rejectWithdrawal(id, note); }
      setWithdrawals((prev) => prev.map((w) => (w.id === id ? { ...w, status: action === "approve" ? "approved" : "rejected" } : w)));
      setNote("");
    } catch {} finally { setActionId(null); }
  };

  const total = withdrawals.length;
  const paginated = withdrawals.slice((page - 1) * pageSize, page * pageSize);

  if (loading) { return <LoadingSpinner />; }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_withdrawals")}</h1>
            <InfoTooltip text="Demandes de retrait des utilisateurs. Approuvez ou rejetez avec une note explicative." />
          </div>
          <p className="text-gray-400 text-[13px] font-medium mt-1">{t("admin_withdrawals_subtitle")}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_amount")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_method")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_status")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_date")}</th>
                <th className="text-right px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <EmptyState icon="fa-solid fa-money-bill-transfer" message={t("admin_no_withdrawals")} colSpan={6} />
              ) : (
                paginated.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{w.user_name || w.user_id || "—"}</td>
                    <td className="px-4 py-3.5 font-bricolage font-extrabold text-gray-900">{w.amount?.toLocaleString("fr-FR")} <span className="text-[11px] text-gray-400">XAF</span></td>
                    <td className="px-4 py-3.5 text-gray-600">{w.method || t("admin_mobile_money")}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        w.status === "approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200/50" :
                        w.status === "rejected" ? "bg-red-50 text-red-600 border-red-200/50" :
                        "bg-amber-50 text-amber-600 border-amber-200/50"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${w.status === "approved" ? "bg-emerald-500" : w.status === "rejected" ? "bg-red-500" : "bg-amber-500"}`} />
                        {w.status === "approved" ? t("admin_approved") : w.status === "rejected" ? t("admin_rejected") : t("admin_pending")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-[12px]">{w.created_at ? new Date(w.created_at).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-4 py-3.5 text-right">
                      {w.status === "pending" && (
                        <div className="flex flex-col items-end gap-2">
                          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                            placeholder="Note (obligatoire pour rejet)..."
                            className="w-full max-w-[200px] px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-primary" />
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleAction(w.id, "approve")} disabled={actionId === w.id}
                              className="text-[11px] px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold transition-all disabled:opacity-50">
                              {actionId === w.id ? <i className="fa-solid fa-spinner fa-spin" /> : t("admin_approve")}
                            </button>
                            <button onClick={() => handleAction(w.id, "reject")} disabled={actionId === w.id}
                              className="text-[11px] px-3 py-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 font-bold transition-all disabled:opacity-50">
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
