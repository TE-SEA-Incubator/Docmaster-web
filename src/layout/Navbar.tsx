import { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { t, lang, setLanguage } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = location.pathname === "/";

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 40);
  }, []);

  if (typeof window !== "undefined") {
    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  return (
    <nav
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHome && !scrolled
          ? "bg-green-dark/90 backdrop-blur-md"
          : "navbar-scrolled"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 h-[68px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/src/assets/images/docmaster.png" alt="DocMaster" className="h-9 w-auto brightness-0 invert" />
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          <li>
            <Link
              to="/"
              className="px-4 py-2 rounded-xl text-white/90 hover:text-primary hover:bg-white/5 text-sm font-semibold transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-house text-xs" /> {t("nav_home")}
            </Link>
          </li>
          <li>
            <Link
              to="/recherche-publique"
              className="px-4 py-2 rounded-xl text-white/90 hover:text-primary hover:bg-white/5 text-sm font-semibold transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-magnifying-glass text-xs" /> {t("nav_search")}
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all"
            >
              <i className="fa-solid fa-globe text-sm" />
              <span>{lang === "fr" ? "Français" : lang === "ar" ? "العربية" : "English"}</span>
            </button>
            {langOpen && (
              <div
                className="absolute right-0 mt-2 w-36 bg-green-dark border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                onMouseLeave={() => setLangOpen(false)}
              >
                <button
                  onClick={() => { setLanguage("fr"); setLangOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/10 transition text-xs font-bold text-white"
                >
                  <i className="fa-solid fa-globe text-primary text-[11px]" /> Français
                </button>
                <button
                  onClick={() => { setLanguage("en"); setLangOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/10 transition text-xs font-bold text-white"
                >
                  <i className="fa-solid fa-globe text-primary text-[11px]" /> English
                </button>
                <button
                  onClick={() => { setLanguage("ar"); setLangOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/10 transition text-xs font-bold text-white"
                >
                  <i className="fa-solid fa-globe text-primary text-[11px]" /> العربية
                </button>
              </div>
            )}
          </div>

          {user ? (
            <Link
              to="/dashboard"
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-primary text-green-dark rounded-[14px] text-sm font-black hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 active:scale-95"
            >
              Dashboard <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-primary text-green-dark rounded-[14px] text-sm font-black hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 active:scale-95"
            >
              {t("nav_login")} <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 border border-white/10 text-white"
          >
            <i className={`fa-solid ${mobileOpen ? "fa-xmark" : "fa-bars"}`} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-green-dark/98 border-t border-white/10 px-5 pb-5 pt-3 space-y-1">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/90 hover:bg-white/10 text-sm font-semibold transition-all"
          >
            <i className="fa-solid fa-house w-4" /> {t("nav_home")}
          </Link>
          <Link
            to="/rechercher"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/90 hover:bg-white/10 text-sm font-semibold transition-all"
          >
            <i className="fa-solid fa-magnifying-glass w-4" /> {t("nav_search")}
          </Link>
          <div className="pt-2">
            <Link
              to={user ? "/dashboard" : "/login"}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-green-dark rounded-2xl font-black text-sm shadow-lg shadow-primary/30"
            >
              {user ? "Dashboard" : t("nav_login")} <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
