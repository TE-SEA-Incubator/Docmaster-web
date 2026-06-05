import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";

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

  useEffect(() => {
    adminService
      .getAllTransactions()
      .then(setTxns)
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

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
        <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_transactions")}</h1>
        <p className="text-gray-400 text-[13px] font-medium mt-1">{t("admin_payment_history")}</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-300">
                    <i className="fa-solid fa-credit-card text-3xl mb-3" />
                    <p className="text-[13px] font-medium text-gray-400">{t("admin_no_transactions")}</p>
                  </td>
                </tr>
              ) : (
                txns.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{t.user_name || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-bricolage font-extrabold text-gray-900">
                        {t.amount?.toLocaleString("fr-FR")} <span className="text-[11px] text-gray-400">XAF</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2 text-gray-600">
                        <i className={`${methodIcons[t.method?.toLowerCase() || ""] || "fa-solid fa-circle"} text-gray-400 text-[11px]`} />
                        {t.method?.replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusStyles[t.status || ""] || "bg-gray-100 text-gray-400 border-gray-200"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          t.status === "completed" || t.status === "success" ? "bg-emerald-500" :
                          t.status === "pending" ? "bg-amber-500" :
                          t.status === "failed" ? "bg-red-500" : "bg-gray-400"
                        }`} />
                        {t.status === "completed" || t.status === "success" ? t("admin_completed") :
                         t.status === "pending" ? t("admin_pending") :
                         t.status === "failed" ? t("admin_failed") : t.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-[12px]">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR") : "—"}
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
