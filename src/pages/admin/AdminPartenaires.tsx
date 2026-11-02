import { useEffect, useState } from "react";
import { adminService } from "../../services/admin";
import type { Partenaire, PartenaireWalletTransaction } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import AntdLocationSelect from "../../components/ui/AntdLocationSelect";
import OsmStreetSearch from "../../components/ui/OsmStreetSearch";

interface PartenaireForm {
  nom_organisation: string;
  email: string;
  telephone: string;
  nom_contact: string;
  prenom_contact: string;
  ville: string;
  region: string;
  adresse: string;
  statut: "ACTIF" | "SUSPENDU" | "INACTIF";
}

const defaultForm: PartenaireForm = {
  nom_organisation: "",
  email: "",
  telephone: "",
  nom_contact: "",
  prenom_contact: "",
  ville: "",
  region: "",
  adresse: "",
  statut: "ACTIF",
};

const PER_PAGE = 10;

const statutBadge = (s: string) => {
  if (s === "ACTIF")
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Actif
      </span>
    );
  if (s === "SUSPENDU")
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Suspendu
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Inactif
    </span>
  );
};

const formatDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const formatFullDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const money = (v: number | string | null | undefined) =>
  `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;

const reasonLabel = (m: any) =>
  m?.motif || (m?.reason === "ADMIN_ADJUSTMENT" ? "Ajustement admin" : m?.reason || "Opération");

export default function AdminPartenaires() {
  const [partenaires, setPartenaires] = useState<Partenaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [error, setError] = useState("");

  // Création / édition
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partenaire | null>(null);
  const [form, setForm] = useState<PartenaireForm>(defaultForm);
  const [locationValue, setLocationValue] = useState<{ region: string; department: string; arrondissement: string }>({
    region: "",
    department: "",
    arrondissement: "",
  });
  const [saving, setSaving] = useState(false);
  const [showCreationSuccess, setShowCreationSuccess] = useState(false);

  // Portefeuille
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletTarget, setWalletTarget] = useState<Partenaire | null>(null);
  const [walletType, setWalletType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletMotif, setWalletMotif] = useState("");
  const [walletSaving, setWalletSaving] = useState(false);

  // Détails + historique
  const [detailTarget, setDetailTarget] = useState<Partenaire | null>(null);
  const [history, setHistory] = useState<PartenaireWalletTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchPartenaires = (p = page) => {
    setLoading(true);
    adminService
      .getPartenaires({ page: p, limit: PER_PAGE, search: search || undefined, statut: statut || undefined })
      .then((res) => {
        setPartenaires(res.rows);
        setTotal(res.total);
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || "Impossible de charger les partenaires.");
        setPartenaires([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPartenaires(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statut]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...defaultForm });
    setLocationValue({ region: "", department: "", arrondissement: "" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (p: Partenaire) => {
    setEditing(p);
    setError("");
    setForm({
      nom_organisation: p.nom_organisation || "",
      email: p.email || "",
      telephone: p.telephone || "",
      nom_contact: p.nom_contact || "",
      prenom_contact: p.prenom_contact || "",
      ville: p.ville || "",
      region: p.region || "",
      adresse: p.adresse || "",
      statut: p.statut,
    });
    setLocationValue({
      region: p.region || "",
      department: "",
      arrondissement: "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_organisation.trim() || !form.email.trim()) return;
    setSaving(true);
    setError("");
    setShowCreationSuccess(false);
    try {
      if (editing) {
        await adminService.updatePartenaire(editing.id, form);
        setModalOpen(false);
      } else {
        await adminService.createPartenaire(form);
        setShowCreationSuccess(true);
        setModalOpen(false);
      }
      fetchPartenaires();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.email?.[0] ||
          "Enregistrement impossible."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement ce partenaire (profil + compte) ?")) return;
    try {
      await adminService.deletePartenaire(id);
      fetchPartenaires();
    } catch (err: any) {
      window.alert(err?.response?.data?.message || "Suppression impossible.");
    }
  };

  const openWallet = (p: Partenaire) => {
    setWalletTarget(p);
    setWalletType("CREDIT");
    setWalletAmount("");
    setWalletMotif("");
    setWalletOpen(true);
  };

  const handleWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletTarget || !walletAmount || Number(walletAmount) <= 0) return;
    setWalletSaving(true);
    try {
      await adminService.adjustPartenaireWallet(walletTarget.id, {
        type: walletType,
        amount: Number(walletAmount),
        motif: walletMotif.trim() || undefined,
      });
      setWalletOpen(false);
      fetchPartenaires();
    } catch (err: any) {
      window.alert(err?.response?.data?.message || "Ajustement impossible.");
    } finally {
      setWalletSaving(false);
    }
  };

  const openDetails = async (p: Partenaire) => {
    setDetailTarget(p);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const res = await adminService.getPartenaireWalletHistory(p.id, { limit: 100 });
      setHistory(res.history);
      setDetailTarget((cur) => (cur ? { ...cur, wallet_balance: res.balance } : cur));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  if (loading && page === 1 && partenaires.length === 0) return <LoadingSpinner />;

  const inputCls =
    "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              Partenaires
              <InfoTooltip text="Organisations partenaires : déclarent des trouvailles et disposent d'un portefeuille de récompenses." />
            </h1>
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">
            Gérer les organisations partenaires. Leur accès se fait via /partenaire.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-[#2D5A42] text-white px-4 py-2 rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors"
        >
          <i className="ph ph-plus text-xs" />
          Nouveau partenaire
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="relative">
          <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher (organisation, email, tél)"
            className="w-72 pl-9 pr-3 py-2 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors"
          />
        </div>
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A]"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIF">Actif</option>
          <option value="SUSPENDU">Suspendu</option>
          <option value="INACTIF">Inactif</option>
        </select>
        <button
          onClick={() => fetchPartenaires(1)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <i className="ph ph-arrow-clockwise text-[11px]" />
          Actualiser
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-[12px] text-red-600">{error}</div>}

      {/* Table */}
      {partenaires.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded">
          <EmptyState icon="ph ph-building" message="Aucun partenaire pour le moment." />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3">Organisation</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Ville</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Solde</th>
                <th className="px-5 py-3">Créé le</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partenaires.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900 text-[13px]">{p.nom_organisation}</div>
                    <div className="text-[11px] text-gray-400">{p.email}</div>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-gray-600">
                    {p.prenom_contact || p.nom_contact
                      ? `${p.prenom_contact || ""} ${p.nom_contact || ""}`.trim()
                      : (p.telephone || "—")}
                    {p.telephone && (p.prenom_contact || p.nom_contact) && <div className="text-[11px] text-gray-400">{p.telephone}</div>}
                    {p.must_change_password && (
                      <div className="text-[10px] text-amber-600">Mot de passe à changer</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-gray-600">
                    {p.ville || "—"}
                    {p.region ? `, ${p.region}` : ""}
                  </td>
                  <td className="px-5 py-3">{statutBadge(p.statut)}</td>
                  <td className="px-5 py-3 text-[12px] font-semibold text-gray-800">{money(p.wallet_balance)}</td>
                  <td className="px-5 py-3 text-[12px] text-gray-500">{formatDate(p.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openDetails(p)}
                        title="Détails et historique"
                        className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#2D5A42] hover:border-[#2D5A42]/40 transition-colors"
                      >
                        <i className="ph ph-eye text-[10px]" />
                      </button>
                      <button
                        onClick={() => openWallet(p)}
                        title="Ajuster le portefeuille"
                        className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#E8923A] hover:border-[#E8923A]/40 transition-colors"
                      >
                        <i className="ph ph-wallet text-[10px]" />
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        title="Modifier"
                        className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                      >
                        <i className="ph ph-pen text-[10px]" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4 text-[12px] text-gray-500">
          <span>
            Page {page} / {totalPages} — {total} partenaire(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPage(page - 1);
                fetchPartenaires(page - 1);
              }}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              onClick={() => {
                setPage(page + 1);
                fetchPartenaires(page + 1);
              }}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Modal création / édition */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-lg w-full max-w-lg border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">
                {editing ? "Modifier le partenaire" : "Nouveau partenaire"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50">
                <i className="ph ph-x text-xs" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Nom de l'organisation
                </label>
                <input value={form.nom_organisation} onChange={(e) => setForm({ ...form, nom_organisation: e.target.value })}
                  placeholder="ex: Mairie de Douala" required className={inputCls} />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email institutionnel</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ex: contact@organisation.cm" required className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Téléphone</label>
                  <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    placeholder="ex: 671000000" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Statut</label>
                  <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as any })}
                    className={inputCls}>
                    <option value="ACTIF">Actif</option>
                    <option value="SUSPENDU">Suspendu</option>
                    <option value="INACTIF">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nom du contact</label>
                  <input value={form.nom_contact} onChange={(e) => setForm({ ...form, nom_contact: e.target.value })}
                    placeholder="ex: Ngono" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Prénom du contact</label>
                  <input value={form.prenom_contact} onChange={(e) => setForm({ ...form, prenom_contact: e.target.value })}
                    placeholder="ex: Marie" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Localisation</label>
                <AntdLocationSelect
                  value={locationValue}
                  onChange={(val) => {
                    setLocationValue(val);
                    setForm((f) => ({
                      ...f,
                      region: val.region,
                      ville: val.arrondissement || val.department,
                    }));
                  }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Rue / Adresse</label>
                <OsmStreetSearch
                  value={form.adresse}
                  onChange={(adresse) => setForm((f) => ({ ...f, adresse }))}
                  placeholder="ex: Rue 12, quartier Akwa"
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-[12px] text-red-600">{error}</div>
              )}

              {!editing && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[12px] text-amber-700">
                  Un mot de passe temporaire sera généré et envoyé par e-mail (et SMS si téléphone fourni).
                  Le partenaire devra le changer dès sa première connexion sur /partenaire.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-[13px] text-gray-500 font-medium hover:text-gray-700 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving || !form.nom_organisation.trim() || !form.email.trim()}
                  className="px-5 py-2 bg-[#2D5A42] text-white rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors disabled:opacity-60 flex items-center gap-1.5">
                  {saving && <i className="ph ph-spinner animate-spin text-xs" />}
                  {editing ? "Enregistrer les modifications" : "Créer le partenaire"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal mot de passe temporaire */}
      {showCreationSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowCreationSuccess(false)}>
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
                <i className="ph ph-check text-green-600 text-lg" />
              </div>
              <h3 className="font-bold text-base text-gray-900 text-center mb-1">Partenaire créé</h3>
              <p className="text-[13px] text-gray-500 text-center mb-4">
                Le mot de passe temporaire a été envoyé par e-mail et SMS au partenaire. Il ne s&apos;affiche plus ici pour des raisons de sécurité.
              </p>
              <p className="text-[12px] text-gray-400 text-center mt-3">
                Le partenaire devra le changer à sa première connexion sur /partenaire.
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

      {/* Modal portefeuille */}
      {walletOpen && walletTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setWalletOpen(false)}>
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Portefeuille — {walletTarget.nom_organisation}</h3>
              <button onClick={() => setWalletOpen(false)} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50">
                <i className="ph ph-x text-xs" />
              </button>
            </div>
            <form onSubmit={handleWallet} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-[13px] text-gray-700">
                Solde actuel : <b className="text-[#2D5A42]">{money(walletTarget.wallet_balance)}</b>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Type d'opération</label>
                <select value={walletType} onChange={(e) => setWalletType(e.target.value as any)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A]">
                  <option value="CREDIT">Crédit (ajouter)</option>
                  <option value="DEBIT">Débit (retirer)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Montant (FCFA)</label>
                <input type="number" min="1" step="0.01" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)}
                  placeholder="ex: 5000" required className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Motif (optionnel)</label>
                <input value={walletMotif} onChange={(e) => setWalletMotif(e.target.value)}
                  placeholder="ex: Bonus partenaire" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A]" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setWalletOpen(false)}
                  className="px-4 py-2 text-[13px] text-gray-500 font-medium hover:text-gray-700 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={walletSaving || !walletAmount}
                  className={`px-5 py-2 text-white rounded text-[13px] font-semibold transition-colors disabled:opacity-60 flex items-center gap-1.5 ${
                    walletType === "CREDIT" ? "bg-green-700 hover:bg-green-800" : "bg-red-600 hover:bg-red-700"
                  }`}>
                  {walletSaving && <i className="ph ph-spinner animate-spin text-xs" />}
                  {walletType === "CREDIT" ? "Créditer" : "Débiter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détails + historique */}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetailTarget(null)}>
          <div className="bg-white rounded-lg w-full max-w-3xl border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-base text-gray-900">Détails — {detailTarget.nom_organisation}</h3>
              <button onClick={() => setDetailTarget(null)} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50">
                <i className="ph ph-x text-xs" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Organisation</div>
                  <div className="text-[13px] font-semibold text-gray-900">{detailTarget.nom_organisation}</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</div>
                  <div className="text-[13px] text-gray-700">{detailTarget.email}</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Téléphone</div>
                  <div className="text-[13px] text-gray-700">{detailTarget.telephone || "—"}</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact</div>
                  <div className="text-[13px] text-gray-700">
                    {`${detailTarget.prenom_contact || ""} ${detailTarget.nom_contact || ""}`.trim() || "—"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Localisation</div>
                  <div className="text-[13px] text-gray-700">
                    {[detailTarget.ville, detailTarget.region].filter(Boolean).join(", ") || "—"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Adresse</div>
                  <div className="text-[13px] text-gray-700">{detailTarget.adresse || "—"}</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Statut</div>
                  <div className="text-[13px]">{statutBadge(detailTarget.statut)}</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Solde</div>
                  <div className="text-[13px] font-bold text-[#2D5A42]">{money(detailTarget.wallet_balance)}</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Créé le</div>
                  <div className="text-[13px] text-gray-700">{formatFullDate(detailTarget.created_at)}</div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-bold text-sm text-gray-900 mb-3">Historique du portefeuille</h4>
                {historyLoading ? (
                  <div className="flex justify-center py-8"><LoadingSpinner minHeight="auto" /></div>
                ) : history.length === 0 ? (
                  <EmptyState icon="ph ph-wallet" message="Aucune opération pour le moment." />
                ) : (
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Type</th>
                          <th className="px-4 py-2.5">Montant</th>
                          <th className="px-4 py-2.5">Motif</th>
                          <th className="px-4 py-2.5 text-right">Solde après</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((t) => (
                          <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                            <td className="px-4 py-2.5 text-[12px] text-gray-500">{formatFullDate(t.created_at)}</td>
                            <td className="px-4 py-2.5">
                              {t.type === "CREDIT" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700">
                                  <i className="ph ph-arrow-up text-[9px]" /> Crédit
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                                  <i className="ph ph-arrow-down text-[9px]" /> Débit
                                </span>
                              )}
                            </td>
                            <td className={`px-4 py-2.5 text-[12px] font-semibold ${t.type === "CREDIT" ? "text-green-700" : "text-red-600"}`}>
                              {t.type === "CREDIT" ? "+" : "−"} {money(t.amount)}
                            </td>
                            <td className="px-4 py-2.5 text-[12px] text-gray-600">{reasonLabel(t.metadata) || t.reason}</td>
                            <td className="px-4 py-2.5 text-[12px] text-gray-700 text-right font-medium">{money(t.balance_after)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}