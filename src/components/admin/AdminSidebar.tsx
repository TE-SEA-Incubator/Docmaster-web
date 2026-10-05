import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { deleteToken } from "../../utils/cookie";
import { useI18n } from "../../context/I18nContext";

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = [
    { to: "/admin", icon: "fa-solid fa-chart-pie", label: t("admin_dashboard") },
    { to: "/admin/users", icon: "fa-solid fa-users", label: t("admin_users") },
    { to: "/admin/document-types", icon: "fa-solid fa-file-contract", label: t("admin_document_types") },
    { to: "/admin/subscriptions", icon: "fa-solid fa-star", label: t("admin_subscriptions") },
    { to: "/admin/transactions", icon: "fa-solid fa-receipt", label: t("admin_transactions") },
    { to: "/admin/referrals", icon: "fa-solid fa-user-group", label: t("admin_referrals") },
    { to: "/admin/declarations", icon: "fa-solid fa-folder-open", label: t("admin_declarations") },
    { to: "/admin/autorites", icon: "fa-solid fa-landmark", label: "Autorités" },
    { to: "/admin/partenaires", icon: "fa-solid fa-building", label: "Partenaires" },
    { to: "/admin/matching", icon: "fa-solid fa-shuffle", label: "Matching" },
    { to: "/admin/withdrawals", icon: "fa-solid fa-money-bill-transfer", label: t("admin_withdrawals") },
    { to: "/admin/sms", icon: "fa-solid fa-comment-sms", label: "SMS" },
    { to: "/admin/broadcast", icon: "fa-solid fa-bullhorn", label: "Broadcast" },
    { to: "/admin/activity-log", icon: "fa-solid fa-clock-rotate-left", label: "Journal" },
    { to: "/admin/settings", icon: "fa-solid fa-gear", label: t("admin_settings") },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    deleteToken("admin");
    localStorage.removeItem("docmaster_admin_login");
    navigate("/admin/login");
  };

  return (
    <>
      {/* Overlay mobile — only when sidebar is open on small screens */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-[260px] bg-[#2D5A42] z-40 flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center px-5 h-16 border-b border-white/10 shrink-0">
          <Link to="/admin" className="flex items-center gap-3">
            <img
              src="/src/assets/images/docmaster.png"
              alt="DocMaster"
              className="h-8 w-auto object-contain brightness-0 invert"
            />
            <span className="text-white/90 font-bold text-sm tracking-wide uppercase">Admin</span>
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3 admin-scroll">
          <nav className="flex flex-col px-2 gap-0.5">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-[#E8923A]/20 text-[#E8923A] font-semibold"
                      : "text-white/60 hover:bg-white/8 hover:text-white/90"
                  }`}
                >
                  <i className={`${item.icon} w-4 text-center text-sm shrink-0 ${active ? "text-[#E8923A]" : "text-white/50"}`} />
                  <span className="truncate">{item.label}</span>
                  {active && <span className="ml-auto w-1 h-4 rounded-full bg-[#E8923A] shrink-0" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="px-2 py-3 border-t border-white/10 shrink-0">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium text-red-400/70 hover:bg-white/5 hover:text-red-400 w-full transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-4 text-center text-sm shrink-0" />
            {t("admin_logout")}
          </button>
        </div>
      </aside>

      {/* Logout confirm modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-sm p-6 shadow-xl mx-4 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-right-from-bracket text-red-500 text-lg" />
            </div>
            <h3 className="font-bold text-base text-gray-900 text-center mb-1">{t("logout_confirm_title")}</h3>
            <p className="text-[13px] text-gray-500 text-center mb-6">{t("logout_confirm_desc")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t("logout_confirm_cancel")}
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2.5 bg-red-500 text-white rounded text-[13px] font-semibold hover:bg-red-600 transition-colors"
              >
                {t("logout_confirm_yes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
