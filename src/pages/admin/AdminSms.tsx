import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import apiClient from "../../services/api";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

interface SmsBalance {
  availableUnits: number;
  country: string;
  status: string;
  expirationDate: string;
}

interface CountryStat {
  appid: string;
  usage: number;
  nbEnforcements: number;
}

interface Purchase {
  purchaseDate: string;
  bundleDescription: string;
  price: number;
  currency: string;
  newAvailableUnits: number;
  oldAvailableUnits: number;
  paymentMode: string;
}

export default function AdminSms() {
  const { t } = useI18n();
  const [balance, setBalance] = useState<SmsBalance | null>(null);
  const [usage, setUsage] = useState<CountryStat[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [usageCountry, setUsageCountry] = useState("");
  const [loading, setLoading] = useState(true);

  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get("sms/balance").then((r) => {
        const d = r.data;
        if (d.success && d.data?.length > 0) setBalance(d.data[0]);
      }).catch(() => {}),
      apiClient.get("sms/usage").then((r) => {
        const d = r.data;
        if (d.success && d.data?.partnerStatistics?.statistics?.[0]?.serviceStatistics?.[0]) {
          const svc = d.data.partnerStatistics.statistics[0].serviceStatistics[0];
          setUsageCountry(svc.country);
          setUsage(svc.countryStatistics || []);
        }
      }).catch(() => {}),
      apiClient.get("sms/purchase-history").then((r) => {
        const d = r.data;
        if (d.success && d.data?.length > 0) setPurchases(d.data);
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await apiClient.post("sms/send", { recipients, message: message.trim() });
      setSendResult({ success: res.data.success, message: res.data.message || "SMS envoyé" });
      if (res.data.success) setMessage("");
    } catch (err: any) {
      setSendResult({ success: false, message: err.response?.data?.message || "Erreur d'envoi" });
    } finally { setSending(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-gray-900">{t("admin_sms_title")}</h1>
        <InfoTooltip text="Gérez vos packs SMS Orange et envoyez des messages aux utilisateurs." />
      </div>
      <p className="text-gray-500 text-[13px] mt-0.5 mb-6">{t("admin_sms_subtitle")}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: t("admin_sms_balance"), tooltip: "Unités SMS restantes", value: loading ? "—" : String(balance?.availableUnits ?? "—") },
          { label: t("admin_sms_country"), value: loading ? "—" : (balance?.country ?? "—") },
          { label: t("admin_sms_status"), value: null, status: balance?.status },
          { label: t("admin_sms_expiration"), value: loading ? "—" : balance?.expirationDate ? new Date(balance.expirationDate).toLocaleDateString("fr-FR") : "—" },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{card.label}</span>
            {card.status !== undefined ? (
              <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded border ${card.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {card.status === "ACTIVE" ? t("admin_sms_active") : t("admin_sms_inactive")}
              </span>
            ) : (
              <div className="text-xl font-bold text-gray-900">{card.value}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Send SMS */}
        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-paper-plane text-[#E8923A]" />
            Envoyer un SMS
            <InfoTooltip text="Envoyez un SMS à un ou plusieurs numéros (séparés par des virgules)." />
          </h3>
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Destinataires <span className="text-gray-400 font-normal normal-case">(optionnel, séparés par ,)</span>
              </label>
              <input type="text" value={recipients} onChange={(e) => setRecipients(e.target.value)}
                placeholder="+237677000000, +237655000000"
                className="w-full px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Message *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                placeholder={t("admin_sms_placeholder")} required
                className="w-full px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors resize-none" />
            </div>
            {sendResult && (
              <div className={`px-3 py-2.5 rounded border text-[13px] flex items-center gap-2 ${sendResult.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                <i className={`fa-solid ${sendResult.success ? "fa-circle-check" : "fa-circle-xmark"} shrink-0`} />
                {sendResult.message}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={!message.trim() || sending}
                className="flex items-center gap-1.5 bg-[#2D5A42] text-white px-5 py-2 rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors disabled:opacity-50">
                {sending ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Envoi...</> : <><i className="fa-solid fa-paper-plane text-xs" /> {t("admin_sms_send")}</>}
              </button>
              <span className="text-[12px] text-gray-400">{message.length} caractères</span>
            </div>
          </form>
        </div>

        {/* Usage stats */}
        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            {t("admin_sms_usage_title")}
            <InfoTooltip text="Statistiques d'utilisation par application" />
          </h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-3 py-2 text-[11px] font-bold text-gray-400 uppercase">{t("admin_sms_usage_appid")}</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold text-gray-400 uppercase">{t("admin_sms_country")}</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold text-gray-400 uppercase">{t("admin_sms_usage_sent")}</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold text-gray-400 uppercase">{t("admin_sms_usage_enforcements")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="py-4 text-center text-[13px] text-gray-400">{t("admin_sms_loading")}</td></tr>
              ) : usage.length === 0 ? (
                <EmptyState icon="fa-solid fa-chart-simple" message={t("admin_sms_no_data")} colSpan={4} />
              ) : usage.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[12px]">{row.appid}</td>
                  <td className="px-3 py-2.5 text-[13px]">{usageCountry}</td>
                  <td className="px-3 py-2.5 font-bold text-[#E8923A]">{row.usage}</td>
                  <td className="px-3 py-2.5 text-[13px]">{row.nbEnforcements}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase history */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-800">{t("admin_sms_purchase_title")}</h3>
          <InfoTooltip text="Historique des achats de packs SMS" />
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_sms_purchase_date")}</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_sms_purchase_desc")}</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_sms_purchase_price")}</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_sms_purchase_units")}</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_sms_purchase_payment")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="py-4 text-center text-[13px] text-gray-400">{t("admin_sms_loading")}</td></tr>
            ) : purchases.length === 0 ? (
              <EmptyState icon="fa-solid fa-box" message={t("admin_sms_no_purchases")} colSpan={5} />
            ) : purchases.map((p, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-[11px] text-gray-400">{new Date(p.purchaseDate).toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 text-[13px]">{p.bundleDescription}</td>
                <td className="px-4 py-3 font-semibold text-[13px]">{p.price} {p.currency}</td>
                <td className="px-4 py-3 font-bold text-green-700">+{p.newAvailableUnits - p.oldAvailableUnits}</td>
                <td className="px-4 py-3 text-[11px] text-gray-400">{p.paymentMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
