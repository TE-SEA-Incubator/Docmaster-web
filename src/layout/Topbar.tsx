import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useNotifications } from "../hooks/useNotifications";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  onToggleSidebar?: () => void;
}

export default function Topbar({ title, breadcrumbs = [], onToggleSidebar }: TopbarProps) {
  const { user } = useAuth();
  const { t, lang, setLanguage } = useI18n();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState("");
  const [langOpen, setLangOpen] = useState(false);

  const handleToggle = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else if ((window as any).__sidebarToggle) {
      (window as any).__sidebarToggle();
    }
  };

  const doSearch = () => {
    const q = searchQ.trim();
    if (q) navigate(`/rechercher?q=${encodeURIComponent(q)}`);
    else navigate("/rechercher");
  };

  return (
    <header className="flex-shrink-0 bg-white border-b border-[#E0D5C4] px-4 md:px-6 h-16 flex items-center justify-between z-20">
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
        <button
          id="menuBtn"
          onClick={handleToggle}
          className="flex items-center justify-center bg-none border-none text-[#374151] text-lg cursor-pointer p-1 flex-shrink-0"
          style={{ background: "none", border: "none" }}
        >
          <i className="fa-solid fa-bars" />
        </button>
        <div style={{ minWidth: 0 }}>
          <nav style={{ fontSize: 16.5, color: "#9CA3AF", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {i > 0 && <i className="fa-solid fa-chevron-right" style={{ fontSize: 12 }} />}
                {crumb.href ? (
                  <a href={crumb.href} style={{ color: "#9CA3AF", textDecoration: "none" }}>{crumb.label}</a>
                ) : (
                  <span style={{ color: i === breadcrumbs.length - 1 ? "#1E3A2F" : "#9CA3AF", fontWeight: i === breadcrumbs.length - 1 ? 600 : 400 }}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Desktop search bar */}
        <div className="hidden md:flex flex-1 max-w-md ml-6">
          <div className="relative w-full flex items-center bg-bgMain border border-borderMain rounded-[10px] overflow-hidden focus-within:border-primary transition-all">
            <i className="fa-solid fa-magnifying-glass pl-3 text-textMuted text-[13px]" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder={t("topbar_search")}
              className="flex-1 py-2 px-2 bg-transparent outline-none text-[12.5px] text-textMain placeholder:text-textMuted"
            />
            <button onClick={doSearch} className="pr-2.5 text-primary hover:text-primary-dark transition-colors text-[13px]">
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Link
          to="/declarer"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold hover:bg-blue-600 transition-all"
        >
          <i className="fa-solid fa-triangle-exclamation text-[10px]" /> {t("topbar_declare_lost")}
        </Link>
        <Link
          to="/trouver"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-[11px] font-bold hover:bg-red-600 transition-all"
        >
          <i className="fa-solid fa-hand-holding-hand text-[10px]" /> {t("topbar_found_doc")}
        </Link>
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-[#E0D5C4] text-[#374151] text-[11px] font-bold hover:border-primary transition-all"
          >
            <i className="fa-solid fa-globe text-primary" />
            <span className="hidden sm:inline">
              {lang === "fr" ? "Français" : lang === "ar" ? "العربية" : "English"}
            </span>
          </button>
          {langOpen && (
            <div
              className="absolute right-0 mt-2 w-32 bg-white border border-[#E0D5C4] rounded-xl shadow-lg overflow-hidden z-50"
              onMouseLeave={() => setLangOpen(false)}
            >
              <button
                onClick={() => { setLanguage("fr"); setLangOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 transition text-[11px] font-bold text-gray-700"
              >
                <i className="fa-solid fa-globe text-primary" /> Français
              </button>
              <button
                onClick={() => { setLanguage("en"); setLangOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 transition text-[11px] font-bold text-gray-700"
              >
                <i className="fa-solid fa-globe text-primary" /> English
              </button>
              <button
                onClick={() => { setLanguage("ar"); setLangOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 transition text-[11px] font-bold text-gray-700"
              >
                <i className="fa-solid fa-globe text-primary" /> العربية
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => (window as any).__openNotifModal?.()}
          className="relative w-9 h-9 rounded-[10px] border border-[#E0D5C4] bg-white text-[#6B7280] flex items-center justify-center hover:border-primary hover:text-primary transition-all"
        >
          <i className="fa-solid fa-bell" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-md">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <Link
          to="/infos-profil"
          className="flex items-center gap-2 px-2 py-1 border border-[#E0D5C4] rounded-[10px] bg-white hover:border-primary transition-all"
        >
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-green-dark to-green-mid flex items-center justify-center font-bricolage text-xs font-extrabold text-white">
            {user?.initial || "DM"}
          </div>
          <span className="text-xs font-semibold text-textMain hidden sm:block">{user?.prenom || ""}</span>
        </Link>
      </div>
    </header>
  );
}
