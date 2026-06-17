import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
    { to: "/admin/referrals", icon: "fa-solid fa-user-friends", label: t("admin_referrals") },
    { to: "/admin/declarations", icon: "fa-solid fa-folder-open", label: t("admin_declarations") },
    { to: "/admin/matching", icon: "fa-solid fa-shuffle", label: "Matching" },
    { to: "/admin/withdrawals", icon: "fa-solid fa-money-bill-transfer", label: t("admin_withdrawals") },
    { to: "/admin/sms", icon: "fa-solid fa-comment-sms", label: "SMS" },
    { to: "/admin/activity-log", icon: "fa-solid fa-clock-rotate-left", label: "Journal" },
    { to: "/admin/settings", icon: "fa-solid fa-gear", label: t("admin_settings") },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem("docmaster_admin_login");
    navigate("/admin/login");
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 w-[260px] bg-[#1E3A2F] z-40 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center px-5 py-4 border-b border-white/10 shrink-0">
          <Link to="/admin" className="flex-1">
            <img
              src="/src/assets/images/docmaster.png"
              alt="DocMaster"
              className="h-14 w-auto object-contain rounded brightness-0 invert"
            />
          </Link>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto py-2 custom-scroll">
          <nav className="flex flex-col gap-0.5 px-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`sb-item ${isActive(item.to) ? "active" : ""}`}
              >
                <div className="nav-icon">
                  <i className={item.icon} />
                </div>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="px-2 py-3 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            className="sb-item flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-red-400/70 hover:bg-white/5 hover:text-red-400 w-full"
          >
            <div className="nav-icon">
              <i className="fa-solid fa-right-from-bracket" />
            </div>
            {t("admin_logout")}
          </button>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-right-from-bracket text-red-500 text-xl" />
            </div>
            <h3 className="font-bricolage text-lg font-bold text-textMain text-center mb-2">{t("logout_confirm_title")}</h3>
            <p className="text-[13px] text-textMuted text-center mb-6">{t("logout_confirm_desc")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">{t("logout_confirm_cancel")}</button>
              <button onClick={confirmLogout} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-[13px] font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">{t("logout_confirm_yes")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
