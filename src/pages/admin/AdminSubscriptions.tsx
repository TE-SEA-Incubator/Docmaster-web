import { useEffect, useState, useCallback } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
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
    case "ACTIVE": return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">{t("admin_active")}</span>;
    case "CANCELED": return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{t("admin_cancelled")}</span>;
    default: return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700">{t("admin_expired")}</span>;
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
        <div className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-bold text-white slide-right ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          <i className={`fa-solid ${toast.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"} mr-2`} />
          {toast.message}
        </div>
      )}
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_subscriptions_title")}</h1>
            <InfoTooltip text="Gérez les offres d'abonnement et consultez les abonnements actifs des utilisateurs." />
          </div>
          <p className="text-gray-400 text-[13px] font-medium mt-1">{t("admin_subscriptions_subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("admin_subscriptions_search")} className="px-4 py-2 border border-[#EAE3D8] rounded-xl text-sm outline-none focus:border-primary bg-white w-64" />
          <button onClick={openNew} className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"><i className="fa-solid fa-plus mr-1" />{t("admin_subscriptions_create")}</button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t("admin_subs_total")}</span>
          <div className="font-bricolage text-2xl font-extrabold text-gray-900">{stats?.totalUsers?.toLocaleString() || "0"}</div>
        </div>
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t("admin_subs_mrr")}<InfoTooltip text="Revenu mensuel récurrent estimé" /></span>
          <div className="font-bricolage text-2xl font-extrabold text-gray-900">{stats?.estimatedMonthlyRevenue ? `${stats.estimatedMonthlyRevenue.toLocaleString()} XAF` : "0 XAF"}</div>
        </div>
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t("admin_subs_new")}</span>
          <div className="font-bricolage text-2xl font-extrabold text-gray-900">{stats?.activeSubscriptions?.toLocaleString() || "0"}</div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-bricolage font-bold text-gray-900 mb-6">
          {t("admin_subscriptions_offers")}
          <InfoTooltip text="Forfaits disponibles à la souscription. Cliquez sur le crayon pour modifier." />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.length === 0 ? (<EmptyState icon="fa-solid fa-tags" message={t("admin_no_subscriptions")} />
          ) : (
            plans.map((plan) => {
              const featureEntries = Object.entries(plan.features || {});
              return (
                <div key={plan.id} className={`bg-white border rounded-2xl shadow-sm relative flex flex-col ${plan.is_featured ? "border-primary border-2" : "border-gray-200/60"}`}>
                  {plan.is_featured && <div className="absolute -top-2.5 right-5 bg-primary text-white text-[10px] font-extrabold px-3 py-1 rounded-full">{t("admin_subscriptions_recommended")}</div>}
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bricolage font-bold text-gray-900 text-lg">{plan.name}</h3>
                        <div className="text-2xl font-bricolage font-extrabold text-primary mt-1">
                          {plan.price === 0 ? "Gratuit" : `${plan.price?.toLocaleString()} XAF`}
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold ml-1">
                            {plan.price > 0 ? `/ ${plan.duration_months || 1} mois` : ""}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => openEdit(plan.id)} className="text-gray-400 hover:text-primary transition-colors p-1"><i className="fa-solid fa-pen-to-square" /></button>
                    </div>

                    {featureEntries.length > 0 ? (
                      <div className="space-y-1.5 mt-5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Avantages inclus</p>
                        {featureEntries.map(([key, val]) => {
                          const def = featMap.get(key);
                          const label = def?.label || key;
                          const type = def?.type || "string";
                          const icon = featureIcon(key);
                          const formatted = formatFeatureValue(val, type);
                          const isBool = type === "boolean";
                          const enabled = val === true || (typeof val === "number" && val > 0) || (Array.isArray(val) && val.length > 0);
                          const desc = def?.description || "";
                          return (
                            <div key={key} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg ${enabled ? "bg-green-50/50" : "bg-gray-50"}`}>
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${enabled ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-300"}`}>
                                <i className={`fa-solid ${icon} text-[10px]`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-[12px] font-medium ${enabled ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
                                {(key === "docs_per_type" || key === "objects_limit") && desc && (
                                  <p className="text-[9.5px] text-gray-400 mt-0.5 leading-tight">{desc}</p>
                                )}
                              </div>
                              <span className={`text-[11px] font-bold flex-shrink-0 ${enabled ? "text-gray-900" : "text-gray-300"}`}>
                                {isBool ? (enabled ? <i className="fa-solid fa-check text-green-500" /> : <i className="fa-solid fa-xmark text-gray-300" />) : formatted}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-gray-300 text-xs">Aucun avantage défini</div>
                    )}
                  </div>
                  <div className="px-6 pb-6">
                    <button onClick={() => openEdit(plan.id)} className="w-full py-2.5 border border-[#EAE3D8] rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-primary hover:text-primary transition-all">
                      <i className="fa-solid fa-pen mr-1.5" />Modifier ce plan
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bricolage font-bold text-gray-900 mb-6">{t("admin_subscriptions_recent")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_subscriptions_client")}</th>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_plan")}<InfoTooltip text="Forfait souscrit par l'utilisateur" /></th>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_status")}</th>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_amount")}</th>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase">{t("admin_subscriptions_expiration")}</th>
                <th className="py-3 px-4 font-bold text-[11px] text-gray-400 uppercase text-right">{t("admin_actions")}<InfoTooltip text="Changer le statut de l'abonnement" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {paginatedSubs.length === 0 ? (
                <EmptyState icon="fa-solid fa-receipt" message={t("admin_subs_recent_empty")} colSpan={6} />
              ) : (
                paginatedSubs.map((s) => {
                  const dateFin = s.date_fin ? new Date(s.date_fin).toLocaleDateString("fr-FR") : s.expiry_date ? new Date(s.expiry_date).toLocaleDateString("fr-FR") : "—";
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4"><div className="flex flex-col"><span className="font-semibold text-sm text-gray-900">{s.user_name || "—"}</span><span className="text-[11px] text-gray-400">{s.user_email || ""}</span></div></td>
                      <td className="text-sm">{s.plan_name || "—"}</td>
                      <td>{statusBadge(s.status || "", t)}</td>
                      <td className="font-bold">{s.price?.toLocaleString() || 0} XAF</td>
                      <td className="text-xs text-gray-400">{dateFin}</td>
                      <td className="text-right">
                        <select
                          value={s.status || ""}
                          onChange={(e) => updateStatus(s.id, e.target.value)}
                          disabled={statusUpdating === s.id}
                          className="px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:border-primary bg-white disabled:opacity-50"
                        >
                          <option value="ACTIVE">Actif</option>
                          <option value="EXPIRED">Expiré</option>
                          <option value="CANCELED">Annulé</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-gray-200/60 shadow-xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bricolage text-lg font-bold text-gray-900">{editingId ? t("admin_subscriptions_modal_title_edit") : t("admin_subscriptions_modal_title_new")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t("admin_subscriptions_plan_name")}</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Premium" required className="px-4 py-2.5 border border-[#EAE3D8] rounded-xl text-sm outline-none focus:border-primary transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2"><label className="text-[10px] font-bold text-gray-400 uppercase">{t("admin_subscriptions_price")}</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="px-4 py-2.5 border border-[#EAE3D8] rounded-xl text-sm outline-none focus:border-primary transition-all" /></div>
                <div className="flex flex-col gap-2"><label className="text-[10px] font-bold text-gray-400 uppercase">{t("admin_subscriptions_duration")}</label><input type="number" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })} className="px-4 py-2.5 border border-[#EAE3D8] rounded-xl text-sm outline-none focus:border-primary transition-all" /></div>
              </div>
              {features.length > 0 && (
                <div className="space-y-1 pt-4 border-t border-[#EAE3D8]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Avantages du plan</p>
                  {features.map((feat) => (
                    <div key={feat.code} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <i className={`fa-solid ${featureIcon(feat.code)} text-[10px] text-primary`} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-700">{feat.label}</span>
                          {feat.description && <span className="text-[10px] text-gray-400">{feat.description}</span>}
                        </div>
                      </div>
                      {feat.type === "boolean" ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={form.features[feat.code] || false} onChange={(e) => setForm({ ...form, features: { ...form.features, [feat.code]: e.target.checked } })} className="sr-only peer" />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                        </label>
                      ) : (
                        <input type="number" value={form.features[feat.code] ?? ""} onChange={(e) => setForm({ ...form, features: { ...form.features, [feat.code]: e.target.value === "" ? null : Number(e.target.value) } })} className="w-20 px-2 py-1.5 border border-[#EAE3D8] rounded-lg text-xs text-center outline-none focus:border-primary" placeholder="0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between py-2 px-2 rounded-lg bg-amber-50/50 border border-amber-100/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                    <i className="fa-solid fa-star text-amber-500 text-[10px]" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{t("admin_subscriptions_featured")}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2 text-sm text-gray-500 font-medium hover:text-gray-700 transition-colors">{t("admin_subscriptions_cancel")}</button>
                <button type="submit" disabled={saving || !form.name.trim()} className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-60">{saving ? t("admin_subscriptions_saving") : t("admin_subscriptions_save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
