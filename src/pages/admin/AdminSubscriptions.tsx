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

const statusBadge = (status: string, t: (k: string) => string) => {
  switch (status) {
    case "ACTIVE": return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">{t("admin_active")}</span>;
    case "CANCELED": return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{t("admin_cancelled")}</span>;
    default: return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700">{t("admin_expired")}</span>;
  }
};

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
  const pageSize = 10;
  const [form, setForm] = useState({
    name: "", price: 0, duration_months: 1, is_featured: false, features: {} as Record<string, any>,
  });

  const loadData = useCallback(() => {
    Promise.all([
      adminService.getDashboardStats().then(setStats).catch(() => {}),
      adminService.getAllSubscriptions().then(setSubs).catch(() => setSubs([])),
      adminService.getPlans().then(setPlans).catch(() => setPlans([])),
      adminService.getFeatureDefinitions().then(setFeatures).catch(() => setFeatures([])),
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
  const openEdit = (id: string) => {
    setEditingId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan) setForm({ name: plan.name, price: plan.price, duration_months: plan.duration_months || 1, is_featured: plan.is_featured || false, features: plan.features || {} });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = { name: form.name, price: form.price, duration_months: form.duration_months, is_featured: form.is_featured, features: form.features };
      if (editingId) { await adminService.updatePlan(editingId, data); } else { await adminService.createPlan(data); }
      setModalOpen(false);
      adminService.getPlans().then(setPlans).catch(() => {});
    } catch {} finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setStatusUpdating(id);
    try {
      await adminService.updateSubscriptionStatus(id, status);
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch {} finally { setStatusUpdating(null); }
  };

  if (loading) { return <LoadingSpinner />; }

  return (
    <div>
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
              const featuresHtml = Object.entries(plan.features || {}).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-xs text-gray-600">
                  <i className={`fa-solid w-3 ${val === true ? "fa-check text-green-500" : "fa-circle-dot text-gray-300"}`} />
                  <span>{key}: <strong className="text-gray-900">{String(val)}</strong></span>
                </div>
              ));
              return (
                <div key={plan.id} className={`bg-white border rounded-2xl p-6 shadow-sm relative ${plan.is_featured ? "border-primary border-2" : "border-gray-200/60"}`}>
                  {plan.is_featured && <div className="absolute -top-2.5 right-5 bg-primary text-white text-[10px] font-extrabold px-3 py-1 rounded-full">{t("admin_subscriptions_recommended")}</div>}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bricolage font-bold text-gray-900 text-lg">{plan.name}</h3>
                    <button onClick={() => openEdit(plan.id)} className="text-gray-400 hover:text-primary transition-colors"><i className="fa-solid fa-pen-to-square" /></button>
                  </div>
                  <div className="text-2xl font-bricolage font-extrabold text-primary mb-6">{plan.price?.toLocaleString()} <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">XAF / {plan.duration_months || 1} {t("abonnement_month")}</span></div>
                  <div className="space-y-3 mb-6">{featuresHtml}</div>
                  <button onClick={() => openEdit(plan.id)} className="w-full py-2 border border-[#EAE3D8] rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">{t("admin_subscriptions_edit_offer")}</button>
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
                <div className="space-y-3 pt-4 border-t border-[#EAE3D8]">
                  {features.map((feat) => (
                    <div key={feat.code} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700">{feat.label}</span>
                        {feat.description && <span className="text-[10px] text-gray-400">{feat.description}</span>}
                      </div>
                      {feat.type === "boolean" ? (
                        <input type="checkbox" checked={form.features[feat.code] || false} onChange={(e) => setForm({ ...form, features: { ...form.features, [feat.code]: e.target.checked } })} className="w-4 h-4 accent-primary" />
                      ) : (
                        <input type="number" value={form.features[feat.code] || ""} onChange={(e) => setForm({ ...form, features: { ...form.features, [feat.code]: e.target.value === "" ? null : Number(e.target.value) } })} className="w-20 px-2 py-1 border border-[#EAE3D8] rounded-lg text-xs" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm font-medium">{t("admin_subscriptions_featured")}</span>
                <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="w-5 h-5 accent-primary" />
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
