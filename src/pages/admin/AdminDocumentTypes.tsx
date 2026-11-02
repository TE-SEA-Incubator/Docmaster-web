import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { phClass } from "../../utils/phosphorIcons";

interface DocumentType {
  id: string;
  nom: string;
  code?: string;
  description?: string;
  icone?: string;
  prix_retrouvaille?: number;
  finder_percent?: number;
  app_percent?: number;
  points_recompense?: number;
  delai_expiration_mois?: number;
  is_active?: boolean;
}

const defaultForm = {
  nom: "",
  code: "",
  description: "",
  icone: "file",
  prix_retrouvaille: 5000,
  finder_percent: 80,
  app_percent: 20,
  points_recompense: 50,
  hasExpiration: true,
  delai_expiration_mois: 12,
};

export default function AdminDocumentTypes() {
  const { t } = useI18n();
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchTypes = () => {
    adminService
      .getDocumentTypes()
      .then((data) => setTypes(Array.isArray(data) ? data : []))
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTypes(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setModalOpen(true);
  };

  const openEdit = (doc: DocumentType) => {
    setEditingId(doc.id);
    const dm = doc.delai_expiration_mois ?? 0;
    setForm({
      nom: doc.nom,
      code: doc.code || "",
      description: doc.description || "",
      icone: doc.icone || "file",
      prix_retrouvaille: doc.prix_retrouvaille ?? 5000,
      finder_percent: doc.finder_percent ?? 80,
      app_percent: doc.app_percent ?? 20,
      points_recompense: doc.points_recompense ?? 50,
      hasExpiration: dm > 0,
      delai_expiration_mois: dm > 0 ? dm : 12,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        delai_expiration_mois: form.hasExpiration ? form.delai_expiration_mois : 0,
      };
      if (editingId) {
        await adminService.updateDocumentType(editingId, payload);
      } else {
        await adminService.createDocumentType(payload);
      }
      setModalOpen(false);
      fetchTypes();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await adminService.toggleDocumentType(id);
      setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t)));
    } catch {}
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              {t("admin_document_types")}
              <InfoTooltip text="Types de documents que les utilisateurs peuvent déclarer." />
            </h1>
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">{t("admin_document_types_subtitle")}</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-[#2D5A42] text-white px-4 py-2 rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors"
        >
          <i className="ph ph-plus text-xs" />
          {t("admin_add_type")}
        </button>
      </div>

      {types.length === 0 ? (
        <EmptyState icon="ph ph-tag-simple" message={t("admin_no_document_types")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((doc) => (
            <div
              key={doc.id}
              className={`bg-white border border-gray-200 rounded p-5 ${doc.is_active === false ? "opacity-60" : ""}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-[#2D5A42]">
                  <i className={`${phClass(doc.icone || "file")} text-base`} />
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEdit(doc)}
                    className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#E8923A] hover:border-[#E8923A]/40 transition-colors"
                  >
                    <i className="ph ph-pen text-[10px]" />
                  </button>
                  <button
                    onClick={() => handleToggle(doc.id)}
                    className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                  >
                    <i className="ph ph-power text-[10px]" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 mb-0.5">{doc.nom}</h3>
              {doc.code && (
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{doc.code}</span>
              )}
              <p className="text-[12px] text-gray-500 my-2 leading-relaxed line-clamp-2">
                {doc.description || "\u00A0"}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {doc.points_recompense != null && (
                  <span className="text-[10px] font-semibold bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-600">
                    +{doc.points_recompense} PTS
                  </span>
                )}
                {doc.finder_percent != null && (
                  <span className="text-[10px] font-semibold bg-green-50 border border-green-200 px-2 py-0.5 rounded text-green-700">
                    {t("admin_reward")} {doc.finder_percent}%
                  </span>
                )}
                {(doc.delai_expiration_mois ?? 0) > 0 ? (
                  <span className="text-[10px] font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-blue-700">
                    {doc.delai_expiration_mois} mois
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-500">
                    Sans expiration
                  </span>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_reward")}</span>
                <span className="font-bold text-[#E8923A]">{(doc.prix_retrouvaille ?? 0).toLocaleString("fr-FR")} XAF</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-lg w-full max-w-lg border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">
                {editingId ? t("admin_edit") : t("admin_add_type")}
              </h3>
              <button onClick={() => setModalOpen(false)} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50">
                <i className="ph ph-x text-xs" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t("admin_name")}</label>
                  <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="ex: Passeport" required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Code</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="ex: PASSPORT" required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t("reportlost_description")}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors resize-none" />
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 border border-gray-200 rounded">
                {[
                  { label: `${t("payment_amount")} (XAF)`, key: "prix_retrouvaille" as const },
                  { label: `% ${t("admin_reward")}`, key: "finder_percent" as const },
                  { label: "% App", key: "app_percent" as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                    <input type="number" value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A]" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t("admin_certificate")} (+pts)</label>
                  <input type="number" value={form.points_recompense}
                    onChange={(e) => setForm({ ...form, points_recompense: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t("admin_icon")}</label>
                  <select value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A]">
                    <option value="file">📄 Document</option>
                    <option value="passport">🛂 Passeport</option>
                    <option value="id-card">🆔 Carte identité</option>
                    <option value="car">🚗 Permis/Véhicule</option>
                    <option value="graduation-cap">🎓 Diplôme</option>
                    <option value="wallet">👛 Portefeuille</option>
                    <option value="phone">📱 Téléphone</option>
                    <option value="laptop">💻 Ordinateur</option>
                    <option value="key">🔑 Clés</option>
                    <option value="bag-shopping">🛍️ Sac</option>
                    <option value="credit-card">💳 Carte bancaire</option>
                    <option value="certificate">📜 Certificat</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">A une date d'expiration ?</label>
                  <button type="button" onClick={() => setForm({ ...form, hasExpiration: !form.hasExpiration })}
                    className={`w-10 h-5 rounded-full transition-colors relative ${form.hasExpiration ? "bg-[#2D5A42]" : "bg-gray-300"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.hasExpiration ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
                  </button>
                </div>
                {form.hasExpiration && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Durée (mois)</label>
                    <input type="number" min={1} value={form.delai_expiration_mois}
                      onChange={(e) => setForm({ ...form, delai_expiration_mois: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A]" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-[13px] text-gray-500 font-medium hover:text-gray-700 transition-colors">
                  {t("confirm_cancel")}
                </button>
                <button type="submit" disabled={saving || !form.nom.trim()}
                  className="px-5 py-2 bg-[#2D5A42] text-white rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors disabled:opacity-60 flex items-center gap-1.5">
                  {saving && <i className="ph ph-spinner animate-spin text-xs" />}
                  {t("admin_add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
