import { useEffect, useState, useCallback } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import { promoService } from "../../services/promoService";
import type { PromoPlan } from "../../services/promoService";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

interface Subscription {
  id: string;
  user_name?: string;
  user_email?: string;
  plan_name?: string;
  status?: string;
  price?: number;
  start_date?: string;
  date_fin?: string;
  expiry_date?: string;
  date_debut?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  features?: Record<string, any>;
  duration_months?: number;
  is_featured?: boolean;
  is_active?: boolean;
}

interface FeatureDefinition {
  code: string;
  label: string;
  type: "boolean" | "number" | "string";
  description?: string;
}

interface DashboardStats {
  totalUsers?: number;
  estimatedMonthlyRevenue?: number;
  activeSubscriptions?: number;
  [key: string]: unknown;
}

const FEATURE_ICONS: Record<string, string> = {
  docs_per_type: "fa-file-circle-exclamation",
  objects_limit: "fa-boxes-stacked",
  sms_alerts: "fa-message",
  email_alerts: "fa-envelope",
  geo_tracking: "fa-location-dot",
  priority_support: "fa-headset",
  verified_badge: "fa-badge-check",
  history_days: "fa-clock-rotate-left",
  ads_free: "fa-ban",
  export_data: "fa-download",
  expiration_management: "fa-calendar-clock",
  expiration_reminders: "fa-bell",
  auto_archive: "fa-box-archive",
};

const statusBadge = (status: string, t: (k: string) => string) => {
  switch (status) {
    case "ACTIVE": return <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">{t("admin_active")}</span>;
    case "CANCELED": return <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-gray-50 text-gray-500 border-gray-200">{t("admin_cancelled")}</span>;
    default: return <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">{t("admin_expired")}</span>;
  }
};

function formatFeatureValue(val: any, type: string): string {
  if (val === null || val === undefined) return "—";
  if (type === "boolean") return val ? "Oui" : "Non";
  if (typeof val === "number") return val.toLocaleString();
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

function featureIcon(code: string): string {
  return FEATURE_ICONS[code] || "fa-circle";
}

export default function AdminSubscriptions() {
  const { t } = useI18n();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [promo, setPromo] = useState<PromoPlan | null>(null);
  const [promoForm, setPromoForm] = useState({ price: 0, duration_months: 2, is_active: true });
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoLoading, setPromoLoading] = useState(true);
  const pageSize = 10;
  const [form, setForm] = useState({
    name: "", price: 0, duration_months: 1, is_featured: false, features: {} as Record<string, any>,
  });

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const featMap = new Map(features.map((f) => [f.code, f]));

  const loadData = useCallback(() => {
    Promise.all([
      adminService.getDashboardStats().then(setStats).catch(() => { console.error("Échec chargement stats"); }),
      adminService.getAllSubscriptions().then(setSubs).catch(() => { console.error("Échec chargement abonnements"); setSubs([]); }),
      adminService.getPlans().then(setPlans).catch(() => { console.error("Échec chargement plans"); setPlans([]); }),
      adminService.getFeatureDefinitions().then(setFeatures).catch(() => { console.error("Échec chargement définitions features"); setFeatures([]); }),
      promoService.getAdminPromo().then((res) => {
        const p = res.data;
        setPromo(p);
        if (p) setPromoForm({ price: p.price, duration_months: p.duration_months, is_active: p.is_active ?? true });
      }).catch(() => { console.error("Échec chargement promo"); }).finally(() => setPromoLoading(false)),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredSubs = subs.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.user_name || "").toLowerCase().includes(q) || (s.user_email || "").toLowerCase().includes(q) || (s.plan_name || "").toLowerCase().includes(q);
  });
  const total = filteredSubs.length;
  const paginatedSubs = filteredSubs.slice((page - 1) * pageSize, page * pageSize);

  const openNew = () => { setEditingId(null); setForm({ name: "", price: 0, duration_months: 1, is_featured: false, features: {} }); setModalOpen(true); };
  const openEdit = async (id: string) => {
    setEditingId(id);
    setModalOpen(true);
    try {
      const plan = await adminService.getPlanById(id);
      setForm({ name: plan.name, price: plan.price, duration_months: plan.duration_months || 1, is_featured: plan.is_featured || false, features: plan.features || {} });
    } catch {
      showToast("Impossible de charger les données du plan", "error");
    }
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data: Record<string, any> = { name: form.name, price: form.price, duration_months: form.duration_months, is_featured: form.is_featured, features: form.features };
      if (editingId) {
        await adminService.updatePlan(editingId, data);
        showToast("Plan modifié avec succès", "success");
      } else {
        const suffix = Math.random().toString(36).substring(2, 6);
        data.id = slugify(form.name) + "-" + suffix;
        await adminService.createPlan(data);
        showToast("Plan créé avec succès", "success");
      }
      setModalOpen(false);
      adminService.getPlans().then(setPlans).catch(() => { console.error("Échec rafraîchissement plans"); });
    } catch {
      showToast("Erreur lors de l'enregistrement du plan", "error");
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setStatusUpdating(id);
    try {
      await adminService.updateSubscriptionStatus(id, status);
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      showToast("Statut mis à jour", "success");
    } catch {
      showToast("Erreur lors de la mise à jour du statut", "error");
    } finally { setStatusUpdating(null); }
  };

  if (loading) { return <LoadingSpinner />; }

  return (
    <div>
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded border shadow-lg text-[13px] font-semibold text-white ${toast.type === "success" ? "bg-green-600 border-green-700" : "bg-red-600 border-red-700"}`}>
          <i className={`fa-solid ${toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation"} mr-2`} />
          {toast.message}
        </div>
      )}
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{t("admin_subscriptions_title")}</h1>
            <InfoTooltip text="Gérez les offres d'abonnement et consultez les abonnements actifs." />
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">{t("admin_subscriptions_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("admin_subscriptions_search")}
            className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] bg-white w-56" />
          <button onClick={openNew}
            className="flex items-center gap-1.5 bg-[#2D5A42] text-white px-4 py-2 rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors">
            <i className="fa-solid fa-plus text-xs" />{t("admin_subscriptions_create")}
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: t("admin_subs_total"), value: stats?.totalUsers?.toLocaleString() || "0" },
          { label: t("admin_subs_mrr"), value: stats?.estimatedMonthlyRevenue ? `${stats.estimatedMonthlyRevenue.toLocaleString()} XAF` : "0 XAF", tooltip: "Revenu mensuel récurrent estimé" },
          { label: t("admin_subs_new"), value: stats?.activeSubscriptions?.toLocaleString() || "0" },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
              {card.label}{card.tooltip && <InfoTooltip text={card.tooltip} />}
            </span>
            <div className="text-xl font-bold text-gray-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-sm text-gray-800 mb-4">
          {t("admin_subscriptions_offers")}
          <InfoTooltip text="Forfaits disponibles à la souscription. Cliquez sur le crayon pour modifier." />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.length === 0 ? (
            <EmptyState icon="fa-solid fa-tags" message={t("admin_no_subscriptions")} />
          ) : plans.map((plan) => {
              const featureEntries = Object.entries(plan.features || {});
              return (
                <div key={plan.id} className={`bg-white border rounded relative flex flex-col ${plan.is_featured ? "border-[#E8923A] border-2" : "border-gray-200"}`}>
                  {plan.is_featured && (
                    <div className="absolute -top-2.5 right-4 bg-[#E8923A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded">
                      {t("admin_subscriptions_recommended")}
                    </div>
                  )}
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{plan.name}</h3>
                        <div className="text-xl font-bold text-[#E8923A] mt-0.5">
                          {plan.price === 0 ? "Gratuit" : `${plan.price?.toLocaleString()} XAF`}
                          {plan.price > 0 && <span className="text-[11px] text-gray-400 font-normal ml-1">/ {plan.duration_months || 1} mois</span>}
                        </div>
                      </div>
                      <button onClick={() => openEdit(plan.id)} className="text-gray-400 hover:text-[#E8923A] transition-colors p-1">
                        <i className="fa-solid fa-pen-to-square text-sm" />
                      </button>
                    </div>
                    {featureEntries.length > 0 && (
                      <div className="space-y-1 mt-4 border-t border-gray-100 pt-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Avantages inclus</p>
                        {featureEntries.map(([key, val]) => {
                          const def = featMap.get(key);
                          const label = def?.label || key;
                          const type = def?.type || "string";
                          const icon = featureIcon(key);
                          const formatted = formatFeatureValue(val, type);
                          const isBool = type === "boolean";
                          const enabled = val === true || (typeof val === "number" && val > 0) || (Array.isArray(val) && val.length > 0);
                          return (
                            <div key={key} className={`flex items-center gap-2 py-1.5 px-2 rounded text-[12px] ${enabled ? "bg-green-50" : "bg-gray-50"}`}>
                              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${enabled ? "bg-[#E8923A]/10 text-[#E8923A]" : "bg-gray-100 text-gray-300"}`}>
                                <i className={`fa-solid ${icon} text-[10px]`} />
                              </div>
                              <span className={`flex-1 ${enabled ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
                              <span className={`text-[11px] font-semibold ${enabled ? "text-gray-900" : "text-gray-300"}`}>
                                {isBool ? (enabled ? <i className="fa-solid fa-check text-green-600 text-[10px]" /> : <i className="fa-solid fa-xmark text-gray-300 text-[10px]" />) : formatted}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="px-5 pb-4">
                    <button onClick={() => openEdit(plan.id)}
                      className="w-full py-2 border border-gray-200 rounded text-[12px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-[#E8923A] hover:text-[#E8923A] transition-colors">
                      <i className="fa-solid fa-pen text-[10px] mr-1" />Modifier ce plan
                    </button>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-tag text-[#E8923A]" />
          Promotion VIP
          <InfoTooltip text="Gérez le prix et la durée de l'offre promotionnelle VIP." />
        </h3>
        {promoLoading ? (
          <div className="flex items-center justify-center py-8"><LoadingSpinner /></div>
        ) : promo ? (
          <div className="bg-white border border-gray-200 rounded p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prix promo (XAF)</label>
                <input type="number" value={promoForm.price} onChange={(e) => setPromoForm({ ...promoForm, price: Number(e.target.value) })}
                  className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors bg-white" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Durée (mois)</label>
                <input type="number" value={promoForm.duration_months} onChange={(e) => setPromoForm({ ...promoForm, duration_months: Number(e.target.value) })}
                  className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors bg-white" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Statut</label>
                <label className="relative inline-flex items-center cursor-pointer mt-2">
                  <input type="checkbox" checked={promoForm.is_active} onChange={(e) => setPromoForm({ ...promoForm, is_active: e.target.checked })} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D5A42]" />
                  <span className="ml-3 text-[13px] font-medium text-gray-700">{promoForm.is_active ? "Active" : "Inactive"}</span>
                </label>
              </div>
            </div>
            {promo.original_price && (
              <div className="bg-gray-50 border border-gray-200 rounded px-4 py-2 mb-4 text-[13px] text-gray-600">
                <span className="font-medium">Prix original: </span>
                <span className="line-through text-gray-400">{promo.original_price.toLocaleString("fr-FR")} XAF</span>
                <span className="mx-2">→</span>
                <span className="font-bold text-sky-700">{promoForm.price.toLocaleString("fr-FR")} XAF</span>
                <span className="ml-2 text-[12px] text-green-700 font-bold">(-{Math.round((1 - promoForm.price / promo.original_price) * 100)}%)</span>
              </div>
            )}
            <button onClick={async () => {
                setPromoSaving(true);
                try {
                  await promoService.updateAdminPromo({ price: promoForm.price, duration_months: promoForm.duration_months, is_active: promoForm.is_active });
                  const res = await promoService.getAdminPromo();
                  if (res.data) { setPromo(res.data); setPromoForm({ price: res.data.price, duration_months: res.data.duration_months, is_active: res.data.is_active ?? true }); }
                  showToast("Promotion mise à jour avec succès", "success");
                } catch { showToast("Erreur lors de la mise à jour de la promotion", "error"); }
                finally { setPromoSaving(false); }
              }}
              disabled={promoSaving}
              className="flex items-center gap-1.5 bg-[#2D5A42] text-white px-5 py-2 rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors disabled:opacity-60">
              {promoSaving ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Enregistrement...</> : <><i className="fa-solid fa-floppy-disk text-xs" /> Enregistrer la promotion</>}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-300 rounded p-8 text-center">
            <i className="fa-solid fa-tag text-2xl text-gray-300 mb-2" />
            <p className="text-gray-400 text-[13px]">Aucune promotion configurée</p>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-sm text-gray-800">{t("admin_subscriptions_recent")}</h3>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_subscriptions_client")}</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_plan")} <InfoTooltip text="Forfait souscrit" /></th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_status")}</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_amount")}</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_subscriptions_expiration")}</th>
              <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">{t("admin_actions")} <InfoTooltip text="Changer le statut" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedSubs.length === 0 ? (
              <EmptyState icon="fa-solid fa-receipt" message={t("admin_subs_recent_empty")} colSpan={6} />
            ) : paginatedSubs.map((s) => {
                const dateFin = s.date_fin ? new Date(s.date_fin).toLocaleDateString("fr-FR") : s.expiry_date ? new Date(s.expiry_date).toLocaleDateString("fr-FR") : "—";
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[13px] text-gray-900">{s.user_name || "—"}</div>
                      <div className="text-[11px] text-gray-400">{s.user_email || ""}</div>
                    </td>
                    <td className="py-3 px-4 text-[13px] text-gray-700">{s.plan_name || "—"}</td>
                    <td className="py-3 px-4">{statusBadge(s.status || "", t)}</td>
                    <td className="py-3 px-4 font-bold text-[13px] text-gray-900">{s.price?.toLocaleString() || 0} XAF</td>
                    <td className="py-3 px-4 text-[11px] text-gray-400">{dateFin}</td>
                    <td className="py-3 px-4 text-right">
                      <select value={s.status || ""} onChange={(e) => updateStatus(s.id, e.target.value)}
                        disabled={statusUpdating === s.id}
                        className="px-2 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-[#E8923A] bg-white disabled:opacity-50">
                        <option value="ACTIVE">Actif</option>
                        <option value="EXPIRED">Expiré</option>
                        <option value="CANCELED">Annulé</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-lg w-full max-w-lg border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">{editingId ? t("admin_subscriptions_modal_title_edit") : t("admin_subscriptions_modal_title_new")}</h3>
              <button onClick={() => setModalOpen(false)} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50">
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t("admin_subscriptions_plan_name")}</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Premium" required
                  className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t("admin_subscriptions_price")}</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t("admin_subscriptions_duration")}</label>
                  <input type="number" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })}
                    className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
                </div>
              </div>
              {features.length > 0 && (
                <div className="border-t border-gray-100 pt-4 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Avantages du plan</p>
                  {features.map((feat) => (
                    <div key={feat.code} className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <i className={`fa-solid ${featureIcon(feat.code)} text-[10px] text-gray-500`} />
                        </div>
                        <span className="text-[12px] font-medium text-gray-700">{feat.label}</span>
                      </div>
                      {feat.type === "boolean" ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={form.features[feat.code] || false}
                            onChange={(e) => setForm({ ...form, features: { ...form.features, [feat.code]: e.target.checked } })}
                            className="sr-only peer" />
                          <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D5A42]" />
                        </label>
                      ) : (
                        <input type="number" value={form.features[feat.code] ?? ""}
                          onChange={(e) => setForm({ ...form, features: { ...form.features, [feat.code]: e.target.value === "" ? null : Number(e.target.value) } })}
                          className="w-20 px-2 py-1.5 border border-gray-200 rounded text-[12px] text-center outline-none focus:border-[#E8923A]" placeholder="0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between py-2 px-2 rounded bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-star text-amber-500 text-sm" />
                  <span className="text-[12px] font-medium text-gray-700">{t("admin_subscriptions_featured")}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E8923A]" />
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] text-gray-500 font-medium hover:text-gray-700">
                  Annuler
                </button>
                <button type="submit" disabled={saving || !form.name.trim()}
                  className="px-5 py-2 bg-[#2D5A42] text-white rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors disabled:opacity-60 flex items-center gap-1.5">
                  {saving && <i className="fa-solid fa-spinner fa-spin text-xs" />}
                  {editingId ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
