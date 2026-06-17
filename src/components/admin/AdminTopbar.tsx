import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import apiClient from "../../services/api";

interface AdminTopbarProps {
  onToggleSidebar: () => void;
  unreadCount: number;
  onNotifToggle: () => void;
  adminInitial: string;
}

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "admin_dashboard",
  "/admin/users": "admin_users",
  "/admin/subscriptions": "admin_subscriptions",
  "/admin/transactions": "admin_transactions",
  "/admin/referrals": "admin_referrals",
  "/admin/declarations": "admin_declarations",
  "/admin/withdrawals": "admin_withdrawals",
  "/admin/document-types": "admin_document_types",
  "/admin/settings": "admin_settings",
  "/admin/sms": "SMS",
  "/admin/activity-log": "Journal",
  "/admin/matching": "Matching",
};

interface SearchResult {
  users: { id: string; name: string; email: string; phone: string; role: string; created_at: string }[];
  declarations: { id: string; doc_master_id: string; declaration_type: string; status: string; user_name: string; created_at: string }[];
}

export default function AdminTopbar({ onToggleSidebar, unreadCount, onNotifToggle, adminInitial }: AdminTopbarProps) {
  const { t, lang, setLanguage } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const pathParts = location.pathname.split("/").filter(Boolean);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      apiClient
        .get(`admin/global-search`, { params: { q: searchQuery.trim() } })
        .then((res) => {
          if (res.data?.success) {
            setSearchResults(res.data.data);
            setSearchOpen(true);
          }
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goToResult = (type: "users" | "declarations") => {
    setSearchOpen(false);
    setSearchQuery("");
    if (type === "users") navigate("/admin/users");
    else navigate("/admin/declarations");
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#EAE3D8]/80 flex items-center justify-between px-4 lg:px-6 h-16 gap-3">
      {/* Left: hamburger + breadcrumbs + search (all hidden on mobile) */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 flex items-center justify-center  hover:bg-gray-50 transition-all"
        >
          <i className="fa-solid fa-bars  text-xl" />
        </button>
      

        {/* Breadcrumbs — desktop only */}
        <nav className="hidden md:flex items-center gap-1.5 text-[15px] min-w-0 flex-shrink">
          <Link to="/admin" className="text-gray-400 hover:text-primary transition-colors font-medium">
            <i className="fa-solid fa-house text-[15px] mr-1" />
            {t("admin_dashboard")}
          </Link>
          {pathParts.slice(1).map((part, i) => {
            const fullPath = "/admin/" + pathParts.slice(1, i + 2).join("/");
            const isLast = i === pathParts.length - 2;
            const label = ROUTE_LABELS[fullPath] || part;
            return (
              <span key={fullPath} className="flex items-center gap-1.5 min-w-0">
                <i className="fa-solid fa-chevron-right text-[8px] text-gray-300 flex-shrink-0" />
                {isLast ? (
                  <span className="text-gray-800 font-bold truncate">{label.startsWith("admin_") ? t(label) : label}</span>
                ) : (
                  <Link to={fullPath} className="text-gray-400 hover:text-primary transition-colors font-medium truncate">
                    {label.startsWith("admin_") ? t(label) : label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        {/* Search bar — desktop only */}
        <div ref={searchRef} className="hidden md:flex items-center relative flex-1 min-w-[200px] max-w-sm ml-4">
          <div className="relative w-full">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults && (searchResults.users.length > 0 || searchResults.declarations.length > 0)) setSearchOpen(true); }}
              placeholder={t("admin_search_placeholder") || "Rechercher..."}
              className="w-full pl-10 pr-10 py-2.5 bg-[#F9F6F0] border-2 border-[#EAE3D8] rounded-2xl text-[13px] font-medium text-gray-700 outline-none focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,166,75,0.1)] transition-all placeholder:text-gray-400"
            />
            {searching ? (
              <i className="fa-solid fa-spinner fa-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-primary text-xs" />
            ) : (
              <i className="fa-solid fa-arrow-right absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
            )}
          </div>

          {/* Search results dropdown */}
          {searchOpen && searchResults && (searchResults.users.length > 0 || searchResults.declarations.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
              {searchResults.users.length > 0 && (
                <div>
                  <button onClick={() => goToResult("users")} className="w-full px-3 py-2 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between">
                    <span><i className="fa-solid fa-users mr-1.5" />{t("admin_users")}</span>
                    <i className="fa-solid fa-arrow-right text-[9px]" />
                  </button>
                  {searchResults.users.map((u) => (
                    <div key={u.id} className="px-3 py-2 hover:bg-primary/5 transition-colors cursor-pointer border-b border-gray-50 last:border-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{u.name || "—"}</p>
                      <p className="text-[11px] text-gray-400 truncate">{u.email || u.phone}</p>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.declarations.length > 0 && (
                <div>
                  <button onClick={() => goToResult("declarations")} className="w-full px-3 py-2 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between">
                    <span><i className="fa-solid fa-file-lines mr-1.5" />{t("admin_declarations")}</span>
                    <i className="fa-solid fa-arrow-right text-[9px]" />
                  </button>
                  {searchResults.declarations.map((d) => (
                    <div key={d.id} className="px-3 py-2 hover:bg-primary/5 transition-colors cursor-pointer border-b border-gray-50 last:border-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{d.doc_master_id || d.declaration_type}</p>
                      <p className="text-[11px] text-gray-400 truncate">{d.user_name} — {d.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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
