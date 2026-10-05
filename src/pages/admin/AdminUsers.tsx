import { useEffect, useState, useCallback } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { exportCSV } from "../../utils/csv";

interface User {
  id: string; nom?: string; prenom?: string; email?: string; telephone?: string;
  subscription_status?: string; active_plan?: string; wallet_balance?: number;
  points?: number; code_invitation?: string; referral_count?: number;
  is_active?: boolean; is_verified?: boolean; created_at?: string; role?: string;
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
      .then((res) => { setUsers(res.users || []); setTotal(res.total || 0); })
      .catch(() => { setUsers([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`${t("admin_user_delete_confirm")} "${name}" ?\n${t("admin_user_delete_irreversible")}`)) {
      try { await adminService.deleteUser(id); loadUsers(); } catch {}
    }
  };

  const handleExport = () => {
    exportCSV(users, [
      { key: "nom", label: "Nom" }, { key: "prenom", label: "Prénom" },
      { key: "email", label: "Email" }, { key: "telephone", label: "Téléphone" },
      { key: "subscription_status", label: "Abonnement" }, { key: "points", label: "Points" },
      { key: "wallet_balance", label: "Portefeuille" }, { key: "created_at", label: "Inscription" },
    ], "utilisateurs");
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{t("admin_users")}</h1>
            <InfoTooltip text="Liste complète des utilisateurs inscrits." />
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">{t("admin_users_subtitle")}</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <i className="fa-solid fa-download text-[10px]" /> CSV
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white border border-gray-200 rounded flex flex-col min-h-0">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nom, email, téléphone..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors placeholder:text-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] bg-white text-gray-700"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="EXPIRED">Expiré</option>
            <option value="CANCELED">Annulé</option>
          </select>
          <span className="text-[12px] text-gray-400 ml-auto">{total} utilisateur{total !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_user")} <InfoTooltip text="Nom, prénom et email" />
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Abonnement</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user_wallet")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user_points")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user_referral_code")}</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_user_referrals_count")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_registered_on")}</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <EmptyState colSpan={8} icon="fa-solid fa-users" message={t("admin_no_users_found")} />
              ) : (
                users.map((u) => {
                  const initial = ((u.prenom?.[0] || "") + (u.nom?.[0] || "")).toUpperCase() || "?";
                  const fullName = [u.prenom, u.nom].filter(Boolean).join(" ");
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelected(u)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded border border-gray-200 bg-[#E8F5EE] flex items-center justify-center text-[11px] font-bold text-[#2D5A42]">
                            {initial}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-gray-900 leading-tight">{fullName}</div>
                            <div className="text-[11px] text-gray-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.subscription_status === "ACTIVE" ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                            {u.active_plan || t("admin_active")}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-gray-50 text-gray-500 border-gray-200">
                            {t("admin_user_free")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{(u.wallet_balance ?? 0).toLocaleString()} XAF</td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-semibold text-[#E8923A]">{u.points ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-[11px] bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-gray-700">
                          {u.code_invitation || "—"}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-center text-[13px] text-gray-600">{u.referral_count ?? 0}</td>
                      <td className="px-4 py-3 text-[11px] text-gray-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(u.id, fullName)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title={t("admin_user_delete_title")}
                        >
                          <i className="fa-solid fa-trash-can text-xs" />
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

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-lg border border-gray-200 shadow-xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Détail utilisateur</h3>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-5 p-4 bg-gray-50 border border-gray-100 rounded">
                <div className="w-12 h-12 rounded border border-gray-200 bg-[#2D5A42] flex items-center justify-center text-lg font-bold text-white">
                  {((selected.prenom?.[0] || "") + (selected.nom?.[0] || "")).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{[selected.prenom, selected.nom].filter(Boolean).join(" ")}</p>
                  <p className="text-[13px] text-gray-500">{selected.email}</p>
                  {selected.telephone && <p className="text-[12px] text-gray-400">{selected.telephone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[13px]">
                {[
                  { label: "Rôle", value: selected.role || "USER" },
                  { label: "Vérifié", value: selected.is_verified ? "✓ Oui" : "✗ Non", valueClass: selected.is_verified ? "text-green-700 font-semibold" : "text-red-600 font-semibold" },
                  { label: "Abonnement", value: selected.active_plan || "Gratuit" },
                  { label: "Portefeuille", value: `${(selected.wallet_balance ?? 0).toLocaleString()} XAF`, valueClass: "font-semibold text-[#E8923A]" },
                  { label: "Points", value: String(selected.points ?? 0), valueClass: "font-semibold text-[#E8923A]" },
                  { label: "Code parrainage", value: selected.code_invitation || "—", valueClass: "font-mono text-xs" },
                  { label: "Filleuls", value: String(selected.referral_count ?? 0) },
                  { label: "Inscrit le", value: selected.created_at ? new Date(selected.created_at).toLocaleString("fr-FR") : "—", colSpan: true },
                ].map((row, i) => (
                  <div key={i} className={`p-3 bg-gray-50 border border-gray-100 rounded ${(row as any).colSpan ? "col-span-2" : ""}`}>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{row.label}</span>
                    <span className={`font-medium text-gray-900 ${(row as any).valueClass || ""}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="px-5 py-2 bg-[#2D5A42] text-white rounded text-[13px] font-semibold hover:bg-[#2D5A42] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
