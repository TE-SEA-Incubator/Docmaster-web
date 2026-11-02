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
  "/admin/reports": "Signalements",
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

  const langLabel = lang === "fr" ? "FR" : lang === "ar" ? "AR" : "EN";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 gap-3 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger */}
        <button
          onClick={onToggleSidebar}
          className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          aria-label="Menu"
        >
          <i className="ph ph-hamburger text-sm" />
        </button>

        {/* Breadcrumbs — desktop only */}
        <nav className="hidden md:flex items-center gap-1 text-sm min-w-0">
          <Link to="/admin" className="text-gray-400 hover:text-gray-700 transition-colors font-medium shrink-0">
            {t("admin_dashboard")}
          </Link>
          {pathParts.slice(1).map((part, i) => {
            const fullPath = "/admin/" + pathParts.slice(1, i + 2).join("/");
            const isLast = i === pathParts.length - 2;
            const label = ROUTE_LABELS[fullPath] || part;
            return (
              <span key={fullPath} className="flex items-center gap-1 min-w-0">
                <i className="ph ph-caret-right text-[9px] text-gray-300 shrink-0" />
                {isLast ? (
                  <span className="text-gray-800 font-semibold truncate">{label.startsWith("admin_") ? t(label) : label}</span>
                ) : (
                  <Link to={fullPath} className="text-gray-400 hover:text-gray-700 transition-colors font-medium truncate">
                    {label.startsWith("admin_") ? t(label) : label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        {/* Search — desktop only */}
        <div ref={searchRef} className="hidden md:block relative ml-3 w-56">
          <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults && (searchResults.users.length > 0 || searchResults.declarations.length > 0))
                setSearchOpen(true);
            }}
            placeholder={t("admin_search_placeholder") || "Rechercher..."}
            className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] text-gray-700 outline-none focus:border-[#E8923A] focus:bg-white transition-colors placeholder:text-gray-400"
          />
          {searching ? (
            <i className="ph ph-spinner animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          ) : null}

          {/* Search results dropdown */}
          {searchOpen && searchResults && (searchResults.users.length > 0 || searchResults.declarations.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg overflow-hidden z-50 max-h-72 overflow-y-auto">
              {searchResults.users.length > 0 && (
                <div>
                  <button
                    onClick={() => goToResult("users")}
                    className="w-full px-3 py-2 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <span><i className="ph ph-users mr-1.5" />{t("admin_users")}</span>
                    <i className="ph ph-arrow-right text-[9px]" />
                  </button>
                  {searchResults.users.map((u) => (
                    <div key={u.id} className="px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{u.name || "—"}</p>
                      <p className="text-[11px] text-gray-400 truncate">{u.email || u.phone}</p>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.declarations.length > 0 && (
                <div>
                  <button
                    onClick={() => goToResult("declarations")}
                    className="w-full px-3 py-2 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <span><i className="ph ph-file-text mr-1.5" />{t("admin_declarations")}</span>
                    <i className="ph ph-arrow-right text-[9px]" />
                  </button>
                  {searchResults.declarations.map((d) => (
                    <div key={d.id} className="px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0">
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

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded text-[12px] font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <i className="ph ph-globe text-gray-400 text-xs" />
            <span>{langLabel}</span>
            <i className="ph ph-caret-down text-[9px] text-gray-400" />
          </button>
          {langOpen && (
            <div
              className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg overflow-hidden z-50"
              onMouseLeave={() => setLangOpen(false)}
            >
              {[
                { code: "fr", label: "Français" },
                { code: "en", label: "English" },
                { code: "ar", label: "العربية" },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code as any); setLangOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2.5 hover:bg-gray-50 transition-colors text-[13px] text-gray-700 ${lang === l.code ? "font-bold text-[#2D5A42]" : "font-medium"}`}
                >
                  {l.label}
                  {lang === l.code && <i className="ph ph-check ml-auto text-[#E8923A] text-xs" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          onClick={onNotifToggle}
          className="relative w-9 h-9 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          title={t("notification_title")}
        >
          <i className="ph ph-bell text-sm" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          )}
        </button>

        {/* Admin avatar */}
        <div className="w-9 h-9 rounded border border-[#E8923A]/40 bg-[#2D5A42] flex items-center justify-center text-white font-bold text-sm uppercase">
          {adminInitial[0]}
        </div>
      </div>
    </header>
  );
}
