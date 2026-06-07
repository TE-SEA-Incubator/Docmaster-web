import { useEffect, useState, useCallback } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { exportCSV } from "../../utils/csv";

interface User {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  subscription_status?: string;
  active_plan?: string;
  wallet_balance?: number;
  points?: number;
  code_invitation?: string;
  referral_count?: number;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  role?: string;
}

export default function AdminUsers() {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const pageSize = 20;

  const loadUsers = useCallback(() => {
    setLoading(true);
    adminService
      .getAdminUsers({ page, limit: pageSize, search, status: statusFilter })
      .then((res) => {
        setUsers(res.users || []);
        setTotal(res.total || 0);
      })
      .catch(() => { setUsers([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`${t("admin_user_delete_confirm")} "${name}" ?\n${t("admin_user_delete_irreversible")}`)) {
      try {
        await adminService.deleteUser(id);
        loadUsers();
      } catch {}
    }
  };

  const handleExport = () => {
    exportCSV(users, [
      { key: "nom", label: "Nom" },
      { key: "prenom", label: "Prénom" },
      { key: "email", label: "Email" },
      { key: "telephone", label: "Téléphone" },
      { key: "subscription_status", label: "Abonnement" },
      { key: "points", label: "Points" },
      { key: "wallet_balance", label: "Portefeuille" },
      { key: "created_at", label: "Inscription" },
    ], "utilisateurs");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-11 h-11 rounded-full border-[3px] border-gray-200 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_users")}</h1>
            <InfoTooltip text="Liste complète des utilisateurs inscrits. Vous pouvez filtrer, exporter et gérer chaque utilisateur." />
          </div>
          <p className="text-gray-400 text-[13px] font-medium mt-1">{t("admin_users_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-1.5">
            <i className="fa-solid fa-download text-[10px]" />
            CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm mb-6">
        <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher nom, email, téléphone..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors placeholder:text-gray-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="EXPIRED">Expiré</option>
            <option value="CANCELED">Annulé</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_user")}
                  <InfoTooltip text="Nom, prénom et email de l'utilisateur" />
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Abonnement
                  <InfoTooltip text="Plan actif et statut de l'abonnement" />
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user_wallet")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user_points")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user_referral_code")}</th>
                <th className="text-center px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user_referrals_count")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_registered_on")}</th>
                <th className="text-right px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-300">
                  <i className="fa-solid fa-users text-3xl mb-3" />
                  <p className="text-[13px] font-medium text-gray-400">{t("admin_no_users_found")}</p>
                </td></tr>
              ) : (
                users.map((u) => {
                  const initial = ((u.prenom?.[0] || "") + (u.nom?.[0] || "")).toUpperCase() || "?";
                  const fullName = [u.prenom, u.nom].filter(Boolean).join(" ");
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => setSelected(u)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-[34px] h-[34px] rounded-xl bg-green-50 flex items-center justify-center text-[12px] font-bold text-green-700">{initial}</div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{fullName}</span>
                            <span className="text-xs text-gray-400">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.subscription_status === "ACTIVE" ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 uppercase tracking-wider">{u.active_plan || t("admin_active")}</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wider">{t("admin_user_free")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{u.wallet_balance ?? 0} XAF</td>
                      <td className="px-4 py-3"><span className="text-orange-500 font-bold">{u.points ?? 0}</span></td>
                      <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200">{u.code_invitation || "---"}</span></td>
                      <td className="px-4 py-3 text-center">{u.referral_count ?? 0}</td>
                      <td className="px-4 py-3 text-[11px] text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "---"}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(u.id, fullName)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title={t("admin_user_delete_title")}>
                          <i className="fa-solid fa-trash-can" />
                        </button>
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

      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-gray-200/60 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bricolage text-lg font-bold text-gray-900">Détail utilisateur</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {((selected.prenom?.[0] || "") + (selected.nom?.[0] || "")).toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{[selected.prenom, selected.nom].filter(Boolean).join(" ")}</p>
                <p className="text-sm text-gray-500">{selected.email}</p>
                {selected.telephone && <p className="text-xs text-gray-400">{selected.telephone}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Rôle</span>
                <span className="font-bold text-gray-900">{selected.role || "USER"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Vérifié</span>
                <span className={`font-bold ${selected.is_verified ? "text-green-600" : "text-red-500"}`}>{selected.is_verified ? "Oui" : "Non"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Abonnement</span>
                <span className="font-bold text-gray-900">{selected.active_plan || "Gratuit"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Portefeuille</span>
                <span className="font-bold text-primary">{(selected.wallet_balance ?? 0).toLocaleString()} XAF</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Points</span>
                <span className="font-bold text-orange-500">{selected.points ?? 0}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Code parrainage</span>
                <span className="font-mono text-xs font-bold text-gray-900">{selected.code_invitation || "---"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Filleuls</span>
                <span className="font-bold text-gray-900">{selected.referral_count ?? 0}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Inscrit le</span>
                <span className="text-sm text-gray-900">{selected.created_at ? new Date(selected.created_at).toLocaleString("fr-FR") : "---"}</span>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button onClick={() => setSelected(null)} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
