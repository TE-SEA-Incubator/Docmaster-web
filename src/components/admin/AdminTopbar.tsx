import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";

interface AdminTopbarProps {
  onToggleSidebar: () => void;
  unreadCount: number;
  onNotifToggle: () => void;
  adminInitial: string;
}

export default function AdminTopbar({ onToggleSidebar, unreadCount, onNotifToggle, adminInitial }: AdminTopbarProps) {
  const { t, lang, setLanguage } = useI18n();
  const [langOpen, setLangOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#EAE3D8]/80 flex items-center justify-between px-4 lg:px-6 h-16 gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#EAE3D8] text-gray-500 hover:bg-gray-50 transition-all shadow-sm lg:hidden"
        >
          <i className="fa-solid fa-bars text-sm" />
        </button>
        <Link
          to="/"
          className="w-10 h-10 lg:hidden flex items-center justify-center rounded-xl bg-white border border-[#EAE3D8] text-primary"
        >
          <i className="fa-solid fa-globe" />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#EAE3D8] text-gray-500 text-[11px] font-bold hover:border-primary hover:text-primary transition-all"
          >
            <i className="fa-solid fa-globe text-primary" />
            <span className="hidden sm:inline">
              {lang === "fr" ? "Français" : lang === "ar" ? "العربية" : "English"}
            </span>
          </button>
          {langOpen && (
            <div
              className="absolute right-0 mt-2 w-32 bg-white border border-[#EAE3D8] rounded-xl shadow-lg overflow-hidden z-50"
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
          onClick={onNotifToggle}
          className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title={t("notification_title")}
        >
          <i className="fa-solid fa-bell text-xl" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
          )}
        </button>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5A64B] to-[#D98A30] flex items-center justify-center text-white font-bold text-sm uppercase shadow-sm">
          {adminInitial[0]}
        </div>
      </div>
    </header>
  );
}
