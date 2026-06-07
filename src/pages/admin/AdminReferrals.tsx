import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

interface Referral {
  id: string;
  referrer_name?: string;
  referred_name?: string;
  status?: string;
  reward?: number;
  created_at?: string;
}

export default function AdminReferrals() {
  const { t } = useI18n();
  const [refs, setRefs] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getAllReferrals()
      .then(setRefs)
      .catch(() => setRefs([]))
      .finally(() => setLoading(false));
  }, []);

  const reward = async (id: string) => {
    try {
      await adminService.rewardReferral(id);
      setRefs((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rewarded" } : r)));
    } catch {}
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_referrals")}</h1>
          <InfoTooltip text="Liste des parrainages : utilisateurs qui ont invité d'autres personnes à rejoindre la plateforme." />
        </div>
        <p className="text-gray-400 text-[13px] font-medium mt-1">{t("admin_referrals_subtitle")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_sponsor")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_godchild")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_status")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_reward")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_date")}</th>
                <th className="text-right px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {refs.length === 0 ? (
                <EmptyState icon="fa-solid fa-gift" message={t("admin_no_referrals")} colSpan={6} />
              ) : (
                refs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{r.referrer_name || "—"}</td>
                    <td className="px-4 py-3.5 text-gray-600">{r.referred_name || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        r.status === "rewarded"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200/50"
                          : r.status === "pending"
                          ? "bg-amber-50 text-amber-600 border-amber-200/50"
                          : "bg-gray-100 text-gray-400 border-gray-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          r.status === "rewarded" ? "bg-emerald-500" :
                          r.status === "pending" ? "bg-amber-500" : "bg-gray-400"
                        }`} />
                        {r.status === "rewarded" ? t("admin_rewarded") : r.status === "pending" ? t("admin_pending") : r.status || t("admin_pending")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-700">
                      {r.reward ? `${r.reward.toLocaleString("fr-FR")} XAF` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-[12px]">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {r.status === "pending" && (
                        <button
                          onClick={() => reward(r.id)}
                          className="text-[11px] px-4 py-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-lg hover:shadow-primary/20 font-bold transition-all"
                        >
                          <i className="fa-solid fa-gift mr-1.5 text-[10px]" />
                          {t("admin_reward_btn")}
                        </button>
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
