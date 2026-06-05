import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";

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

  useEffect(() => {
    adminService
      .getPendingWithdrawals()
      .then((data) => setWithdrawals(Array.isArray(data) ? data : []))
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionId(id);
    try {
      if (action === "approve") {
        await adminService.approveWithdrawal(id, note);
      } else {
        await adminService.rejectWithdrawal(id, note);
      }
      setWithdrawals((prev) => prev.map((w) => (w.id === id ? { ...w, status: action === "approve" ? "approved" : "rejected" } : w)));
      setNote("");
    } catch {} finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-11 h-11 rounded-full border-[3px] border-gray-200 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_withdrawals")}</h1>
        <p className="text-gray-400 text-[13px] font-medium mt-1">{t("admin_withdrawals_subtitle")}</p>
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
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-300">
                    <i className="fa-solid fa-money-bill-transfer text-3xl mb-3" />
                    <p className="text-[13px] font-medium text-gray-400">{t("admin_no_withdrawals")}</p>
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{w.user_name || w.user_id || "—"}</td>
                    <td className="px-4 py-3.5 font-bricolage font-extrabold text-gray-900">
                      {w.amount?.toLocaleString("fr-FR")} <span className="text-[11px] text-gray-400">XAF</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{w.method || t("admin_mobile_money")}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        w.status === "approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200/50" :
                        w.status === "rejected" ? "bg-red-50 text-red-600 border-red-200/50" :
                        "bg-amber-50 text-amber-600 border-amber-200/50"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          w.status === "approved" ? "bg-emerald-500" :
                          w.status === "rejected" ? "bg-red-500" : "bg-amber-500"
                        }`} />
                        {w.status === "approved" ? t("admin_approved") : w.status === "rejected" ? t("admin_rejected") : t("admin_pending")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-[12px]">
                      {w.created_at ? new Date(w.created_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {w.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAction(w.id, "approve")}
                            disabled={actionId === w.id}
                            className="text-[11px] px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold transition-all disabled:opacity-50"
                          >
                            {actionId === w.id ? <i className="fa-solid fa-spinner fa-spin" /> : t("admin_approve")}
                          </button>
                          <button
                            onClick={() => handleAction(w.id, "reject")}
                            disabled={actionId === w.id}
                            className="text-[11px] px-3 py-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 font-bold transition-all disabled:opacity-50"
                          >
                            {t("admin_reject")}
                          </button>
                        </div>
                      )}
                      {(w.status === "approved" || w.status === "rejected") && (
                        <span className="text-[11px] text-gray-400 font-medium">
                          {t("admin_processed")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
