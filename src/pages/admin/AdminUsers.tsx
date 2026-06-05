import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminService
      .getAdminUsers()
      .then((res) => setUsers(res.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.nom?.toLowerCase().includes(search.toLowerCase()) ||
      u.prenom?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`${t("admin_user_delete_confirm")} "${name}" ?\n${t("admin_user_delete_irreversible")}`)) {
      try {
        await adminService.deleteUser(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } catch {}
    }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bricolage text-2xl font-black text-gray-900">
            {t("admin_users")}
          </h1>
          <p className="text-gray-400 text-[13px] font-medium mt-1">
            {t("admin_users_subtitle")}
          </p>
        </div>
        <div className="relative w-72">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin_search_user")}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors placeholder:text-gray-300"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_user")}
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_user_subscription")}
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_user_wallet")}
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_user_points")}
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_user_referral_code")}
                </th>
                <th className="text-center px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_user_referrals_count")}
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_registered_on")}
                </th>
                <th className="text-right px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-300">
                    <i className="fa-solid fa-users text-3xl mb-3" />
                    <p className="text-[13px] font-medium text-gray-400">
                      {t("admin_no_users_found")}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const initial = (
                    (u.prenom?.[0] || "") + (u.nom?.[0] || "")
                  ).toUpperCase() || "?";
                  const fullName = [u.prenom, u.nom].filter(Boolean).join(" ");
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-[34px] h-[34px] rounded-xl bg-green-50 flex items-center justify-center text-[12px] font-bold text-green-700">
                            {initial}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {fullName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.subscription_status === "ACTIVE" ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 uppercase tracking-wider">
                            {u.active_plan || t("admin_active")}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wider">
                            {t("admin_user_free")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {u.wallet_balance ?? 0} XAF
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-orange-500 font-bold">
                          {u.points ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          {u.code_invitation || "---"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.referral_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-400">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : "---"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(u.id, fullName)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title={t("admin_user_delete_title")}
                        >
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
      </div>
    </div>
  );
}
