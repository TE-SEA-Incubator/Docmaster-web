import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

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

  useEffect(() => {
    fetchTypes();
  }, []);

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
      setTypes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t))
      );
    } catch {}
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bricolage text-2xl font-black text-gray-900">
            {t("admin_document_types")}
            <InfoTooltip text="Types de documents que les utilisateurs peuvent déclarer (perte ou trouvaille)." />
          </h1>
          <p className="text-gray-400 text-[13px] font-medium mt-1">
            {t("admin_document_types_subtitle")}
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
        >
          <i className="fa-solid fa-plus" />
          {t("admin_add_type")}
        </button>
      </div>

      {types.length === 0 ? (
        <EmptyState icon="fa-solid fa-tags" message={t("admin_no_document_types")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {types.map((doc) => (
            <div
              key={doc.id}
              className={`bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all ${
                doc.is_active === false ? "opacity-60" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary-dark">
                  <i className={`fa-solid fa-${doc.icone || "file"} text-xl`} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(doc)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary/30 transition-all"
                  >
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                  <button
                    onClick={() => handleToggle(doc.id)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-all"
                  >
                    <i className="fa-solid fa-power-off text-xs" />
                  </button>
                </div>
              </div>

              <h3 className="font-bricolage font-bold text-gray-900 mb-1">
                {doc.nom}
              </h3>
              {doc.code && (
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                  {doc.code}
                </span>
              )}

              <p className="text-xs text-gray-500 my-3 leading-relaxed">
                {doc.description || "\u00A0"}
              </p>

              <div className="flex gap-2 mb-4">
                {doc.points_recompense != null && (
                  <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">
                    +{doc.points_recompense} PTS
                  </span>
                )}
                {doc.finder_percent != null && (
                  <span className="text-[10px] font-bold bg-green-50 px-2 py-1 rounded text-green-700">
                    {t("admin_reward")} {doc.finder_percent}%
                  </span>
                )}
                {(doc.delai_expiration_mois ?? 0) > 0 ? (
                  <span className="text-[10px] font-bold bg-blue-50 px-2 py-1 rounded text-blue-700">
                    {doc.delai_expiration_mois} mois
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">
                    Sans expiration
                  </span>
                )}
              </div>

              <div className="pt-4 border-t border-dashed border-gray-200 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_reward")}
                </span>
                <span className="font-bold text-primary-dark">
                  {(doc.prix_retrouvaille ?? 0).toLocaleString("fr-FR")} XAF
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-8 border border-gray-200/60 shadow-xl max-h-[90vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bricolage text-xl font-bold text-gray-900 mb-6">
              {editingId ? t("admin_edit") : t("admin_add_type")}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    {t("admin_name")}
                  </label>
                  <input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="ex: Passeport"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="field">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Code
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="ex: PASSPORT"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <div className="field">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  {t("reportlost_description")}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                    {t("payment_amount")}
                  </label>
                  <input
                    type="number"
                    value={form.prix_retrouvaille}
                    onChange={(e) => setForm({ ...form, prix_retrouvaille: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                    % {t("admin_reward")}
                  </label>
                  <input
                    type="number"
                    value={form.finder_percent}
                    onChange={(e) => setForm({ ...form, finder_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                    % App
                  </label>
                  <input
                    type="number"
                    value={form.app_percent}
                    onChange={(e) => setForm({ ...form, app_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="field">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      {t("admin_certificate")} (+)
                    </label>
                    <input
                      type="number"
                      value={form.points_recompense}
                      onChange={(e) => setForm({ ...form, points_recompense: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div className="field">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      {t("admin_icon")}
                    </label>
                    <select
                      value={form.icone}
                      onChange={(e) => setForm({ ...form, icone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    >
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
                      <option value="book">📖 Livre</option>
                      <option value="credit-card">💳 Carte bancaire</option>
                      <option value="certificate">📜 Certificat</option>
                      <option value="image">🖼️ Photo</option>
                      <option value="heart">❤️ Bijou</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      A une date d'expiration ?
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hasExpiration: !form.hasExpiration })}
                      className={`w-11 h-6 rounded-full transition-colors ${form.hasExpiration ? "bg-primary" : "bg-gray-300"}`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${form.hasExpiration ? "translate-x-[22px]" : "translate-x-[4px]"}`} />
                    </button>
                  </div>
                  {form.hasExpiration && (
                    <div className="field">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                        Durée de validité (mois)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.delai_expiration_mois}
                        onChange={(e) => setForm({ ...form, delai_expiration_mois: Math.max(1, Number(e.target.value)) })}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  )}
                </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 text-sm text-gray-500 font-medium hover:text-gray-700 transition-colors"
                >
                  {t("confirm_cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.nom.trim()}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {saving && <i className="fa-solid fa-spinner fa-spin" />}
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
