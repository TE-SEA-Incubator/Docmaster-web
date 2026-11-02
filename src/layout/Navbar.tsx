import { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { getPhotoUrl } from "../utils/image";
import VipAvatar, { isVipUser } from "../components/ui/VipBadge";

export default function Navbar({ promoBarVisible = false }: { promoBarVisible?: boolean }) {
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

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Pattern SVG identique à la hero section
  const svgBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Cpath fill='%23e8923a' fill-opacity='0.18' d='M600 325.1v-1.17c-6.5 3.83-13.06 7.64-14.68 8.64-10.6 6.56-18.57 12.56-24.68 19.09-5.58 5.95-12.44 10.06-22.42 14.15-1.45.6-2.96 1.2-4.83 1.9l-4.75 1.82c-9.78 3.75-14.8 6.27-18.98 10.1-4.23 3.88-9.65 6.6-16.77 8.84-1.95.6-3.99 1.17-6.47 1.8l-6.14 1.53c-5.29 1.35-8.3 2.37-10.54 3.78-3.08 1.92-6.63 3.26-12.74 5.03a384.1 384.1 0 0 1-4.82 1.36c-2.04.58-3.6 1.04-5.17 1.52a110.03 110.03 0 0 0-11.2 4.05c-2.7 1.15-5.5 3.93-8.78 8.4a157.68 157.68 0 0 0-6.15 9.2c-5.75 9.07-7.58 11.74-10.24 14.51a50.97 50.97 0 0 1-4.6 4.22c-2.33 1.9-10.39 7.54-11.81 8.74a14.68 14.68 0 0 0-3.67 4.15c-1.24 2.3-1.9 4.57-2.78 8.87-2.17 10.61-3.52 14.81-8.2 22.1-4.07 6.33-6.8 9.88-9.83 12.99-.47.48-.95.96-1.5 1.48l-3.75 3.56c-1.67 1.6-3.18 3.12-4.86 4.9a42.44 42.44 0 0 0-9.89 16.94c-2.5 8.13-2.72 15.47-1.76 27.22.47 5.82.51 6.36.51 8.18 0 10.51.12 17.53.63 25.78.24 4.05.56 7.8.97 11.22h.9c-1.13-9.58-1.5-21.83-1.5-37 0-1.86-.04-2.4-.52-8.26-.94-11.63-.72-18.87 1.73-26.85a41.44 41.44 0 0 1 9.65-16.55c1.67-1.76 3.18-3.27 4.83-4.85.63-.6 3.13-2.96 3.75-3.57a71.6 71.6 0 0 0 1.52-1.5c3.09-3.16 5.86-6.76 9.96-13.15 4.77-7.42 6.15-11.71 8.34-22.44.86-4.21 1.5-6.4 2.68-8.6.68-1.25 1.79-2.48 3.43-3.86 1.38-1.15 9.43-6.8 11.8-8.72 1.71-1.4 3.26-2.81 4.7-4.3 2.72-2.85 4.56-5.54 10.36-14.67a156.9 156.9 0 0 1 6.1-9.15c3.2-4.33 5.9-7.01 8.37-8.07 3.5-1.5 7.06-2.77 11.1-4.02a233.84 233.84 0 0 1 7.6-2.2l2.38-.67c6.19-1.79 9.81-3.16 12.98-5.15 2.14-1.33 5.08-2.33 10.27-3.65l6.14-1.53c2.5-.63 4.55-1.2 6.52-1.82 7.24-2.27 12.79-5.06 17.15-9.05 4.05-3.72 9-6.2 18.66-9.9l4.75-1.82c1.87-.72 3.39-1.31 4.85-1.91 10.1-4.15 17.07-8.32 22.76-14.4 6.05-6.45 13.95-12.4 24.49-18.92 1.56-.96 7.82-4.6 14.15-8.33v-64.58c-4 8.15-8.52 14.85-12.7 17.9-2.51 1.82-5.38 4.02-9.04 6.92a1063.87 1063.87 0 0 0-6.23 4.98l-1.27 1.02a2309.25 2309.25 0 0 1-4.87 3.9c-7.55 6-12.9 10.05-17.61 13.19-3.1 2.06-3.86 2.78-8.06 7.13-5.84 6.07-11.72 8.62-29.15 10.95-11.3 1.5-20.04 4.91-30.75 11.07-1.65.94-7.27 4.27-6.97 4.1-2.7 1.58-4.69 2.69-6.64 3.66-5.63 2.8-10.47 4.17-15.71 4.17-17.13 0-41.44 11.51-51.63 22.83-12.05 13.4-31.42 27.7-45.25 31.16-7.4 1.85-11.85 7.05-14.04 14.69-1.26 4.4-1.58 8.28-1.58 13.82 0 .82.01.98.24 3.63.45 5.18.35 8.72-.77 13.26-1.53 6.2-4.89 12.6-10.59 19.43-13.87 16.65-22.88 46.58-22.88 71.68 0 2.39.02 4.26.06 8.75.12 10.8.1 15.8-.22 21.95-.56 11.18-2.09 20.73-5 29.3h-1.05c2.94-8.56 4.49-18.12 5.05-29.35.31-6.13.34-11.1.22-21.9-.04-4.48-.06-6.36-.06-8.75 0-25.32 9.07-55.47 23.12-72.32 5.6-6.72 8.88-12.99 10.38-19.03 1.09-4.4 1.18-7.85.74-12.93-.23-2.7-.24-2.86-.24-3.72 0-5.62.32-9.57 1.62-14.1 2.28-7.95 6.97-13.44 14.76-15.39 13.6-3.4 32.82-17.59 44.75-30.84C409 360.14 433.58 348.5 451 348.5c5.07 0 9.77-1.33 15.26-4.07 1.93-.96 3.9-2.05 6.58-3.62-.3.18 5.33-3.16 6.98-4.11 10.82-6.21 19.66-9.67 31.11-11.2 17.23-2.3 22.9-4.75 28.57-10.64 4.25-4.41 5.04-5.16 8.22-7.28 4.68-3.11 10.01-7.14 17.55-13.14a1113.33 1113.33 0 0 0 4.86-3.89l1.28-1.02a4668.54 4668.54 0 0 1 6.23-4.98c3.67-2.9 6.55-5.12 9.07-6.95 4.37-3.19 9.16-10.56 13.29-19.4v66.9z'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <nav
      id="navbar"
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        promoBarVisible ? "top-[44px]" : "top-0"
      }`}
      style={{
        backgroundColor: "#fffbf6",
        backgroundImage: svgBg,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderBottom: scrolled ? "1px solid #EAE3D8" : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 12px rgba(0, 0, 0, 0.04)" : "none",
        transition: "all 0.3s ease",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo - Original sans filtre */}
        <Link to="/" className="flex items-center gap-0 flex-shrink-0 transition-transform hover:scale-105">
          <img
            src="/src/assets/images/docmaster.png"
            alt="DocMaster"
            className="h-10 w-auto"
          />
          <span className="font-poppins font-bold text-green-dark text-[21px] leading-none tracking-tight">ocmaster</span>
        </Link>

        {/* Navigation Desktop */}
        <ul className="hidden md:flex items-center gap-1">
          <li>
            <Link
              to="/"
              className={`px-5 py-2.5 rounded-[14px] text-[14px] font-semibold transition-all ${
                location.pathname === "/"
                  ? "text-primary bg-primary/10"
                  : "text-textMain hover:text-primary hover:bg-primary/5"
              }`}
            >
              {t("nav_home")}
            </Link>
          </li>
          <li>
            <Link
              to="/recherche-publique"
              className={`px-5 py-2.5 rounded-[14px] text-[14px] font-semibold transition-all ${
                location.pathname === "/recherche-publique"
                  ? "text-primary bg-primary/10"
                  : "text-textMain hover:text-primary hover:bg-primary/5"
              }`}
            >
              {t("nav_search")}
            </Link>
          </li>
        </ul>

        {/* Actions Desktop */}
        <div className="flex items-center gap-3">
          {/* Sélecteur de langue */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-surface2 hover:bg-borderMain/30 border border-borderMain text-textMain text-[13px] font-semibold transition-all"
            >
              <i className="ph ph-globe text-[15px]" />
              <span className="hidden lg:inline">
                {lang === "fr" ? "FR" : lang === "ar" ? "AR" : "EN"}
              </span>
            </button>
            {langOpen && (
              <>
                {/* Overlay pour fermer le menu */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setLangOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-borderMain rounded-[16px] shadow-2xl overflow-hidden z-50">
                  <button
                    onClick={() => { setLanguage("fr"); setLangOpen(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-primary/5 transition text-[14px] font-semibold ${
                      lang === "fr" ? "text-primary bg-primary/5" : "text-textMain"
                    }`}
                  >
                    <i className="ph ph-check text-[12px] w-4" style={{ opacity: lang === "fr" ? 1 : 0 }} />
                    Français
                  </button>
                  <button
                    onClick={() => { setLanguage("en"); setLangOpen(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-primary/5 transition text-[14px] font-semibold ${
                      lang === "en" ? "text-primary bg-primary/5" : "text-textMain"
                    }`}
                  >
                    <i className="ph ph-check text-[12px] w-4" style={{ opacity: lang === "en" ? 1 : 0 }} />
                    English
                  </button>
                  <button
                    onClick={() => { setLanguage("ar"); setLangOpen(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-primary/5 transition text-[14px] font-semibold ${
                      lang === "ar" ? "text-primary bg-primary/5" : "text-textMain"
                    }`}
                  >
                    <i className="ph ph-check text-[12px] w-4" style={{ opacity: lang === "ar" ? 1 : 0 }} />
                    العربية
                  </button>
                </div>
              </>
            )}
          </div>

          {user ? (
            <Link
              to="/dashboard"
              className="hidden md:flex items-center gap-3 px-4 py-2 bg-surface2 hover:bg-borderMain/30 rounded-[14px] transition-all group border border-borderMain"
            >
              <VipAvatar isVip={isVipUser(user)}>
                {user.photo_url ? (
                  <img src={getPhotoUrl(user.photo_url)} alt="" className="w-8 h-8 rounded-[11px] object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-[11px] bg-primary flex items-center justify-center font-bricolage text-[11px] font-extrabold text-white">
                    {user.initial || "U"}
                  </div>
                )}
              </VipAvatar>
              <span className="text-[14px] font-semibold text-textMain group-hover:text-primary transition-colors">
                {user.prenom || "Mon compte"}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-[14px] text-[14px] font-black transition-all shadow-lg shadow-primary/30 active:scale-95"
            >
              {t("nav_login")}
              <i className="ph ph-arrow-right text-[11px]" />
            </Link>
          )}

          {/* Bouton menu mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-[14px] bg-surface2 border border-borderMain text-textMain hover:bg-borderMain/30 transition-all"
          >
            <i className={`${mobileOpen ? "ph ph-x" : "ph ph-hamburger"} text-[16px]`} />
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileOpen && (
        <div 
          className="md:hidden border-t border-borderMain px-6 pb-6 pt-4 space-y-2" 
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-[14px] text-[14px] font-semibold transition-all ${
              location.pathname === "/"
                ? "text-primary bg-primary/10"
                : "text-textMain hover:bg-primary/5"
            }`}
          >
            <i className="ph ph-house w-5 text-center" />
            {t("nav_home")}
          </Link>
          <Link
            to="/recherche-publique"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-[14px] text-[14px] font-semibold transition-all ${
              location.pathname === "/recherche-publique"
                ? "text-primary bg-primary/10"
                : "text-textMain hover:bg-primary/5"
            }`}
          >
            <i className="ph ph-magnifying-glass w-5 text-center" />
            {t("nav_search")}
          </Link>

          {user ? (
            <div className="flex items-center gap-3 px-4 py-3 border-t border-borderMain mt-3 pt-4">
              <VipAvatar isVip={isVipUser(user)}>
                {user?.photo_url ? (
                  <img src={getPhotoUrl(user.photo_url)} alt="" className="w-10 h-10 rounded-[12px] object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-[12px] bg-primary flex items-center justify-center font-bricolage text-[12px] font-extrabold text-white">
                    {user?.initial || "U"}
                  </div>
                )}
              </VipAvatar>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-textMain truncate">
                  {user?.prenom || ""} {user?.nom || ""}
                </div>
                <div className="text-[12px] text-textMuted truncate">{user?.email || ""}</div>
              </div>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="text-primary hover:text-primary-dark transition-colors"
              >
                <i className="ph ph-arrow-right text-[14px]" />
              </Link>
            </div>
          ) : (
            <div className="pt-3">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-[14px] font-black text-[14px] shadow-lg shadow-primary/30 transition-all"
              >
                {t("nav_login")}
                <i className="ph ph-arrow-right text-[11px]" />
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

