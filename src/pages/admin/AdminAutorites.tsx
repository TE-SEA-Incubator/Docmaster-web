import { useEffect, useState } from "react";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import AntdLocationSelect from "../../components/ui/AntdLocationSelect";

interface Autorite {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  niveau: "HAUTE" | "NORMAL";
  ville: string;
  region?: string | null;
  bureau?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

const defaultForm = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  niveau: "NORMAL",
  ville: "",
  region: "",
  department: "",
  arrondissement: "",
  bureau: "",
};

export default function AdminAutorites() {
  const [autorites, setAutorites] = useState<Autorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreationSuccess, setShowCreationSuccess] = useState(false);

  const fetchAutorites = () => {
    adminService
      .getAutorites()
      .then((data) => setAutorites(Array.isArray(data) ? data : []))
      .catch(() => setAutorites([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAutorites(); }, []);

  const openNew = () => {
    setForm({ ...defaultForm });
    setError("");
    setShowCreationSuccess(false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim() || !form.department.trim()) return;
    setSaving(true);
    setError("");
    setShowCreationSuccess(false);
    try {
      await adminService.createAutorite(form);
      setShowCreationSuccess(true);
      setModalOpen(false);
      fetchAutorites();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.errors?.email?.[0] || "Création impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const target = autorites.find((a) => a.id === id);
      if (!target) return;
      await adminService.updateAutorite(id, { is_active: !target.is_active });
      setAutorites((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a)));
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette autorité ?")) return;
    try {
      await adminService.deleteAutorite(id);
      setAutorites((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  };

  if (loading) return <LoadingSpinner />;

  const niveauBadge = (n: string) =>
    n === "HAUTE" ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 uppercase tracking-wide">
        Haute
      </span>
    ) : (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 uppercase tracking-wide">
        Niveau
      </span>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              Autorités
              <InfoTooltip text="Autorités habilitées à certifier les déclarations de documents perdus ou trouvés." />
            </h1>
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">
            Gérer les autorités institutionnelles. Leur accès se fait via /autorite.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-[#2D5A42] text-white px-4 py-2 rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors"
        >
          <i className="ph ph-plus text-xs" />
          Nouvelle autorité
        </button>
      </div>

      {autorites.length === 0 ? (
        <EmptyState icon="ph ph-bank" message="Aucune autorité pour le moment." />
      ) : (
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3">Autorité</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Niveau</th>
                <th className="px-5 py-3">Bureau</th>
                <th className="px-5 py-3">Ville</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {autorites.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900 text-[13px]">
                      {a.prenom} {a.nom}
                    </div>
                    <div className="text-[11px] text-gray-400">{a.email}</div>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-gray-600">
                    {a.telephone || "—"}
                    {a.must_change_password && (
                      <div className="text-[10px] text-amber-600">Mot de passe à changer</div>
                    )}
                  </td>
                  <td className="px-5 py-3">{niveauBadge(a.niveau)}</td>
                  <td className="px-5 py-3 text-[12px] text-gray-600">{a.bureau || "—"}</td>
                  <td className="px-5 py-3 text-[12px] text-gray-600">
                    {a.ville}
                    {a.region ? `, ${a.region}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    {a.is_active ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => handleToggle(a.id)}
                        title={a.is_active ? "Désactiver" : "Activer"}
                        className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#E8923A] hover:border-[#E8923A]/40 transition-colors"
                      >
                        <i className="ph ph-power text-[10px]" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        title="Supprimer"
                        className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                      >
                        <i className="ph ph-trash text-[10px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-lg w-full max-w-lg border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Nouvelle autorité</h3>
              <button onClick={() => setModalOpen(false)} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50">
                <i className="ph ph-x text-xs" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Prénom</label>
                  <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    placeholder="ex: Marie" required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nom</label>
                  <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="ex: Ngono" required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email institutionnel</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ex: marie.ngono@pndp.cm" required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Téléphone</label>
                  <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    placeholder="ex: 671000000"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Niveau</label>
                  <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A]">
                    <option value="NORMAL">Niveau (ville)</option>
                    <option value="HAUTE">Autorité Haute (territoire)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bureau</label>
                <input value={form.bureau} onChange={(e) => setForm({ ...form, bureau: e.target.value })}
                  placeholder="ex: Bureau n°102"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors" />
              </div>

              <AntdLocationSelect
                value={{ region: form.region, department: form.department, arrondissement: form.arrondissement }}
                onChange={(val) => setForm({
                  ...form,
                  region: val.region,
                  department: val.department,
                  arrondissement: val.arrondissement,
                  ville: val.arrondissement || val.department,
                })}
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-[12px] text-red-600">{error}</div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[12px] text-amber-700">
                Un mot de passe temporaire sera généré et envoyé par e-mail (et SMS si téléphone fourni).
                L'autorité devra le changer dès sa première connexion.
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-[13px] text-gray-500 font-medium hover:text-gray-700 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving || !form.nom.trim() || !form.prenom.trim() || !form.email.trim() || !form.department.trim()}
                  className="px-5 py-2 bg-[#2D5A42] text-white rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors disabled:opacity-60 flex items-center gap-1.5">
                  {saving && <i className="ph ph-spinner animate-spin text-xs" />}
                  Créer l'autorité
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temp password modal */}
      {showCreationSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowCreationSuccess(false)}>
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
                <i className="ph ph-check text-green-600 text-lg" />
              </div>
              <h3 className="font-bold text-base text-gray-900 text-center mb-1">Autorité créée</h3>
              <p className="text-[13px] text-gray-500 text-center mb-4">
                Le mot de passe temporaire a été envoyé par e-mail et SMS à l&apos;autorité. Il ne s&apos;affiche plus ici pour des raisons de sécurité.
              </p>
              <p className="text-[12px] text-gray-400 text-center mt-3">
                L&apos;autorité devra le changer à sa première connexion sur /autorite.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-center">
              <button onClick={() => setShowCreationSuccess(false)} className="px-6 py-2 bg-[#2D5A42] text-white rounded text-[13px] font-semibold">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}