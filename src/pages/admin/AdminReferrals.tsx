import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { statusBadgeClass } from "../../utils/statusBadge";

interface Referral {
  id: string;
  referrer_name?: string;
  referred_name?: string;
  status?: string;
  reward?: number;
  recompense_attribuee?: boolean;
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
      setRefs((prev) => prev.map((r) => (r.id === id ? { ...r, status: "REWARDED" } : r)));
    } catch {}
  };

  const isRewarded = (r: Referral) => {
    const s = (r.status || "").toUpperCase();
    return s === "REWARDED" || s === "VALIDATED" || r.recompense_attribuee === true;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">{t("admin_referrals")}</h1>
          <InfoTooltip text="Liste des parrainages : utilisateurs qui ont invité d'autres personnes." />
        </div>
        <p className="text-gray-500 text-[13px] mt-0.5">{t("admin_referrals_subtitle")}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded flex flex-col min-h-0">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_sponsor")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_godchild")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_status")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_reward")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_date")}</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {refs.length === 0 ? (
                <EmptyState icon="fa-solid fa-gift" message={t("admin_no_referrals")} colSpan={6} />
              ) : (
                refs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 text-[13px]">{r.referrer_name || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">{r.referred_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded border ${isRewarded(r) ? statusBadgeClass("REWARDED") : statusBadgeClass(r.status)}`}>
                        {isRewarded(r) ? t("admin_rewarded")
                          : (r.status || "").toUpperCase() === "PENDING" ? t("admin_pending")
                          : r.status || t("admin_pending")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-gray-700">
                      {r.reward ? `${r.reward.toLocaleString("fr-FR")} XAF` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isRewarded(r) && (
                        <button
                          onClick={() => reward(r.id)}
                          className="text-[12px] px-3 py-1.5 rounded border border-[#E8923A] bg-[#E8923A]/10 text-[#E8923A] hover:bg-[#E8923A]/20 font-semibold transition-colors"
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
