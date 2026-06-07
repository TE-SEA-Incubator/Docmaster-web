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
        <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_sms_title")}</h1>
        <InfoTooltip text="Gérez vos packs SMS Orange et envoyez des messages aux utilisateurs." />
      </div>
      <p className="text-gray-400 text-[13px] font-medium mt-1 mb-8">{t("admin_sms_subtitle")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t("admin_sms_balance")}<InfoTooltip text="Nombre d'unités SMS restantes dans votre pack" /></span>
          <div className="font-bricolage text-2xl font-extrabold text-gray-900">{loading ? <span className="text-gray-300">---</span> : balance?.availableUnits ?? <span className="text-gray-300">---</span>}</div>
        </div>
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t("admin_sms_country")}</span>
          <div className="font-bricolage text-2xl font-extrabold text-gray-900">{loading ? <span className="text-gray-300">---</span> : balance?.country ?? <span className="text-gray-300">---</span>}</div>
        </div>
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t("admin_sms_status")}</span>
          <div className="mt-2">{loading ? <span className="text-gray-300 text-sm font-semibold">---</span> : balance?.status ? (
            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${balance.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{balance.status === "ACTIVE" ? t("admin_sms_active") : t("admin_sms_inactive")}</span>
          ) : <span className="text-gray-300 text-sm font-semibold">---</span>}</div>
        </div>
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t("admin_sms_expiration")}</span>
          <div className="font-bricolage text-lg font-extrabold text-gray-900">{loading ? <span className="text-gray-300">---</span> : balance?.expirationDate ? new Date(balance.expirationDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : <span className="text-gray-300">---</span>}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bricolage font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-paper-plane text-primary" />
            Envoyer un SMS
            <InfoTooltip text="Envoyez un SMS à un ou plusieurs numéros (séparés par des virgules)." />
          </h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Destinataires <span className="text-gray-300">(optionnel, séparés par ,)</span></label>
              <input type="text" value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="+237677000000, +237655000000" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Message *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder={t("admin_sms_placeholder")} required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-all resize-none" />
            </div>
            {sendResult && (
              <div className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 ${sendResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                <i className={`fa-solid ${sendResult.success ? "fa-check-circle" : "fa-circle-xmark"}`} />
                {sendResult.message}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={!message.trim() || sending} className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center gap-2">
                {sending ? <><i className="fa-solid fa-spinner fa-spin" /> Envoi...</> : <><i className="fa-solid fa-paper-plane" /> {t("admin_sms_send")}</>}
              </button>
              <span className="text-[11px] text-gray-400">{message.length} caractères</span>
            </div>
          </form>
        </div>

        <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bricolage font-bold text-gray-900 mb-6">{t("admin_sms_usage_title")}<InfoTooltip text="Statistiques d'utilisation par application" /></h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead><tr>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_sms_usage_appid")}</th>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_sms_country")}</th>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_sms_usage_sent")}</th>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_sms_usage_enforcements")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {loading ? <tr><td colSpan={4} className="py-4 text-center text-gray-400">{t("admin_sms_loading")}</td></tr>
                : usage.length === 0 ? <EmptyState icon="fa-solid fa-chart-simple" message={t("admin_sms_no_data")} colSpan={4} />
                : usage.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs">{row.appid}</td>
                    <td className="py-3 px-4">{usageCountry}</td>
                    <td className="py-3 px-4 font-bold text-primary">{row.usage}</td>
                    <td className="py-3 px-4">{row.nbEnforcements}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bricolage font-bold text-gray-900 mb-6">{t("admin_sms_purchase_title")}<InfoTooltip text="Historique des achats de packs SMS" /></h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead><tr>
              <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_sms_purchase_date")}</th>
              <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_sms_purchase_desc")}</th>
              <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_sms_purchase_price")}</th>
              <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_sms_purchase_units")}</th>
              <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_sms_purchase_payment")}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {loading ? <tr><td colSpan={5} className="py-4 text-center text-gray-400">{t("admin_sms_loading")}</td></tr>
              : purchases.length === 0 ? <EmptyState icon="fa-solid fa-box" message={t("admin_sms_no_purchases")} colSpan={5} />
              : purchases.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-400 text-xs">{new Date(p.purchaseDate).toLocaleString("fr-FR")}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">{p.bundleDescription}</td>
                  <td className="py-3 px-4 font-semibold">{p.price} {p.currency}</td>
                  <td className="py-3 px-4 text-green-600 font-bold">+{p.newAvailableUnits - p.oldAvailableUnits}</td>
                  <td className="py-3 px-4 text-xs text-gray-400">{p.paymentMode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
