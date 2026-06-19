import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

export default function MobileNav() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [declModalOpen, setDeclModalOpen] = useState(false);

  if (!user) return null;

  const current = location.pathname;

  const items = [
    { to: "/dashboard", icon: "fa-solid fa-house", label: t("nav_home") },
    { to: "#decl", icon: "fa-solid fa-circle-plus", label: t("mobile_declaration"), isPlus: true },
    { to: "/mes-documents", icon: "fa-solid fa-folder-open", label: t("mobile_documents") },
    { to: "/mes-appareils", icon: "fa-solid fa-mobile-screen-button", label: t("mobile_objects") },
  ];

  const isActive = (to) => current === to;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-borda pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
        <div className="flex items-end justify-between max-w-lg mx-auto px-2">
          {items.map((item) =>
            item.isPlus ? (
              <button
                key={item.to}
                onClick={() => setDeclModalOpen(true)}
                className="flex flex-col items-center gap-1 py-1 transition-all text-textMuted hover:text-primary active:scale-90 flex-1 min-w-0"
              >
                <i className={`${item.icon} text-sm sm:text-lg`} />
                <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </button>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-1 transition-all flex-1 min-w-0 ${isActive(item.to)
                    ? "text-primary"
                    : "text-textMuted hover:text-primary active:scale-90"
                  }`}
              >
                <i
                  className={`${item.icon} text-sm sm:text-lg ${isActive(item.to)
                      ? "text-primary"
                      : ""
                    }`}
                  style={isActive(item.to) ? { filter: "drop-shadow(0 0 8px rgba(245,166,75,0.6))", transform: "scale(1.1)" } : undefined}
                />
                <span className={`text-[9px] sm:text-[11px] font-bold uppercase tracking-tight truncate max-w-full ${isActive(item.to) ? "text-primary" : ""}`}>
                  {item.label}
                </span>
              </Link>
            )
          )}
        </div>
      </nav>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${declModalOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setDeclModalOpen(false)}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[110] bg-white rounded-t-[24px] sm:rounded-t-[32px] p-4 sm:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out md:hidden max-h-[85vh] overflow-y-auto ${declModalOpen ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="w-10 sm:w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:mb-6" />
        <h3 className="font-bricolage text-lg sm:text-xl font-extrabold text-textMain text-center mb-4 sm:mb-6">
          {t("mobile_make_declaration")}
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:gap-4">
          <button
            onClick={() => { setDeclModalOpen(false); navigate("/declarer"); }}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-50 border border-red-100 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-red-500 flex items-center justify-center text-white text-base sm:text-xl shrink-0">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-textMain text-[13px] sm:text-[15px] truncate">{t("mobile_declare_lost")}</p>
              <p className="text-[10px] sm:text-[11px] text-red-600/70 font-medium truncate">{t("mobile_lost_document_desc")}</p>
            </div>
            <i className="fa-solid fa-chevron-right text-red-300 shrink-0 text-xs sm:text-sm" />
          </button>
          <button
            onClick={() => { setDeclModalOpen(false); navigate("/trouver"); }}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-100 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-600 flex items-center justify-center text-white text-base sm:text-xl shrink-0">
              <i className="fa-solid fa-file-circle-check" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-textMain text-[13px] sm:text-[15px] truncate">{t("mobile_declare_found")}</p>
              <p className="text-[10px] sm:text-[11px] text-blue-600/70 font-medium truncate">{t("mobile_found_something_desc")}</p>
            </div>
            <i className="fa-solid fa-chevron-right text-blue-300 shrink-0 text-xs sm:text-sm" />
          </button>
          <button
            onClick={() => { setDeclModalOpen(false); navigate("/mes-declarations"); }}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-orange-50 border border-orange-100 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-orange-500 flex items-center justify-center text-white text-base sm:text-xl shrink-0">
              <i className="fa-solid fa-file" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-textMain text-[13px] sm:text-[15px] truncate">{t("mobile_my_declarations")}</p>
              <p className="text-[10px] sm:text-[11px] text-red-600/70 font-medium truncate">{t("mobile_view_declarations")}</p>
            </div>
            <i className="fa-solid fa-chevron-right text-red-300 shrink-0 text-xs sm:text-sm" />
          </button>
          <button
            onClick={() => { setDeclModalOpen(false); navigate("/rechercher"); }}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-orange-50 border border-orange-100 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-orange-500 flex items-center justify-center text-white text-base sm:text-xl shrink-0">
              <i className="fa-solid fa-magnifying-glass" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-textMain text-[13px] sm:text-[15px] truncate">{t("mobile_search")}</p>
              <p className="text-[10px] sm:text-[11px] text-red-600/70 font-medium truncate">{t("mobile_search_document")}</p>
            </div>
            <i className="fa-solid fa-chevron-right text-red-300 shrink-0 text-xs sm:text-sm" />
          </button>
        </div>
        <button
          onClick={() => setDeclModalOpen(false)}
          className="w-full mt-4 sm:mt-6 py-3 sm:py-4 text-sm font-bold text-textMuted uppercase tracking-widest"
        >
          {t("mobile_cancel")}
        </button>
      </div>
    </>
  );
}
