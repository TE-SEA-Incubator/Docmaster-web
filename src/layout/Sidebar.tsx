import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => window.innerWidth >= 900);
  const [userClosed, setUserClosed] = useState(false);

  const isLargeScreen = () => window.innerWidth >= 900;

  const navItems = [
    {
      section: t("sidebar_primary"),
      items: [
        { to: "/dashboard", icon: "fa-solid fa-house", label: t("sidebar_dashboard") },
        { to: "/mes-documents", icon: "fa-solid fa-list-check", label: t("sidebar_saved") },
        { to: "/mes-appareils", icon: "fa-solid fa-mobile-screen-button", label: t("sidebar_devices") },
      ],
    },
    {
      section: t("sidebar_account"),
      items: [
        { to: "/mes-declarations", icon: "fa-solid fa-clock-rotate-left", label: t("sidebar_declarations") },
        { to: "/mes-gains", icon: "fa-solid fa-wallet", label: t("sidebar_earnings") },
        { to: "/parrainage", icon: "fa-solid fa-gift", label: t("sidebar_referral") },
        { to: "/abonnement", icon: "fa-solid fa-crown", label: t("sidebar_subscription") },
        { to: "/infos-profil", icon: "fa-solid fa-user", label: t("sidebar_profile") },
      ],
    },
  ];

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 900 && !userClosed) setOpen(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [userClosed]);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar", open ? "260px" : "0px");
  }, [open]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const close = () => { setOpen(false); setUserClosed(true); };
  const toggle = () => { setOpen((p) => !p); setUserClosed(true); };
  (window as any).__sidebarToggle = toggle;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 md:hidden ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={close}
      />

      <aside
        id="sidebar"
        className={`fixed left-0 top-0 bottom-0 w-[260px] bg-[#1E3A2F] z-40 flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex items-center px-5 py-4 border-b border-white/10 flex-shrink-0">
          <Link to="/dashboard">
            <img src="/src/assets/images/docmaster.png" alt="DocMaster" className="h-14 w-auto object-contain rounded brightness-0 invert" />
          </Link>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-2 custom-scroll">
          {navItems.map((section) => (
            <div key={section.section}>
              <div className="px-5 pt-4 pb-1 text-[9.5px] font-bold text-white/30 uppercase tracking-widest">
                {section.section}
              </div>
              <nav className="flex flex-col gap-0.5 px-2">
                {section.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => { if (!isLargeScreen()) close(); }}
                      className={`sb-item ${isActive(item.to) ? "active" : ""}`}
                    >
                      <div className="nav-icon">
                        <i className={`${item.icon}`} />
                      </div>
                      {item.label}
                    </Link>
                ))}
              </nav>
            </div>
          ))}
          <div className="px-5 pt-4 pb-1 text-[9.5px] font-bold text-white/30 uppercase tracking-widest">
            Actions
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            <a
              onClick={handleLogout}
              className="sb-item flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-red-400/70 hover:bg-white/5 hover:text-red-400"
              style={{ cursor: "pointer" }}
            >
              <div className="nav-icon">
                <i className="fa-solid fa-right-from-bracket" />
              </div>
              {t("sidebar_logout")}
            </a>
          </nav>
        </div>

        {/* User footer */}
        <div className="px-2 py-3 border-t border-white/10">
          <Link to="/infos-profil" className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-white/5 transition-colors">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-primary flex items-center justify-center font-bricolage text-[10px] font-extrabold text-white">
              <span>{user?.initial || "DM"}</span>
            </div>
            <div>
              <div className="text-[12.5px] font-semibold text-white leading-tight">
                {user?.prenom || ""} {user?.nom || ""}
              </div>
              <div className="text-[10.5px] text-white/40">
                {user?.subscription?.plan_name ? `${t("sidebar_plan")} ${user.subscription.plan_name}` : t("sidebar_plan_standard")}
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
