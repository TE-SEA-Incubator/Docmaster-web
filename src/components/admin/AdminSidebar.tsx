import { Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: "/admin", icon: "fa-solid fa-chart-pie", label: t("admin_dashboard") },
    { to: "/admin/users", icon: "fa-solid fa-users", label: t("admin_users") },
    { to: "/admin/document-types", icon: "fa-solid fa-file-contract", label: t("admin_document_types") },
    { to: "/admin/subscriptions", icon: "fa-solid fa-star", label: t("admin_subscriptions") },
    { to: "/admin/transactions", icon: "fa-solid fa-receipt", label: t("admin_transactions") },
    { to: "/admin/referrals", icon: "fa-solid fa-user-friends", label: t("admin_referrals") },
    { to: "/admin/declarations", icon: "fa-solid fa-folder-open", label: t("admin_declarations") },
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
    localStorage.removeItem("docmaster_admin_login");
    navigate("/admin/login");
  };

  const adminName = (() => {
    try {
      const stored = localStorage.getItem("docmaster_admin_login");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.nom || parsed?.email?.[0] || "A";
      }
    } catch {}
    return "A";
  })();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-[260px] bg-[#1E3A2F] z-50 flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center px-5 py-4 border-b border-white/10 shrink-0">
          <Link to="/admin">
            <img
              src="/src/assets/images/docmaster.png"
              alt="DocMaster"
              className="h-14 w-auto object-contain rounded brightness-0 invert"
            />
          </Link>
        </div>

        <div className="flex flex-col justify-between flex-1 min-h-0 overflow-hidden">
          <nav className="flex flex-col gap-0.5 px-2 py-4 overflow-y-auto">
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

          <div className="px-2 py-3 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-2.5 px-3 py-2 mb-2 border-b border-white/5">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-primary flex items-center justify-center font-bricolage text-[10px] font-extrabold text-white">
              {adminName[0]}
            </div>
            <div className="text-[12px] font-semibold text-white/80 truncate">{adminName}</div>
          </div>
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
        </div>
      </aside>
    </>
  );
}
