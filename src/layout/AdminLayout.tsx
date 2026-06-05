import { useState, useEffect, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { notificationsService } from "../services/notificationsService";
import type { Notification } from "../types/api";

export default function AdminLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const unreadCount = notifications.filter((n) => !n.lue && !n.is_read).length;

  const loadNotifications = useCallback(() => {
    setLoadingNotifs(true);
    notificationsService
      .getAll()
      .then((res) => setNotifications(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingNotifs(false));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handler = () => loadNotifications();
    window.addEventListener("docmaster:notification", handler);
    return () => window.removeEventListener("docmaster:notification", handler);
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, lue: true, is_read: true }))
      );
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, lue: true, is_read: true } : n
        )
      );
    } catch {}
  };

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
    <div className="min-h-screen bg-[#F4EFE6] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 w-[260px] bg-[#1E3A2F] z-50 flex flex-col transition-all duration-300 ease-out ${
          sidebarOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center px-5 py-4 border-b border-white/10 flex-shrink-0">
          <Link to="/admin">
            <img
              src="/src/assets/images/docmaster.png"
              alt="DocMaster"
              className="h-14 w-auto object-contain rounded brightness-0 invert"
            />
          </Link>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`sb-item ${isActive(item.to) ? "active" : ""}`}
            >
              <div className="nav-icon">
                <i className={item.icon} />
              </div>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-white/10 flex-shrink-0">
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-[#EAE3D8]/80 flex items-center justify-between px-4 lg:px-6 h-16 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
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
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title={t("notification_title")}
            >
              <i className="fa-solid fa-bell text-xl" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
              )}
            </button>
            <div className="w-10 h-10 rounded-full bg-[#F5A64B] flex items-center justify-center text-white font-bold text-sm uppercase">
              {adminName[0]}
            </div>
          </div>
        </header>

        {notifOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setNotifOpen(false)}
            />
            <div className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white border-l border-[#EAE3D8] shadow-2xl flex flex-col animate-slide-in-right">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE3D8]">
                <h3 className="font-bricolage font-bold text-gray-900">
                  {t("notification_title")}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold text-primary hover:text-primary-dark transition-colors"
                    >
                      {t("notification_mark_all_read")}
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#EAE3D8] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <i className="fa-solid fa-xmark text-sm" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scroll">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 rounded-full border-[3px] border-gray-200 border-t-primary animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                    <i className="fa-solid fa-bell-slash text-3xl mb-4" />
                    <p className="text-[13px] font-medium text-gray-400">
                      {t("notification_empty")}
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.lue && !n.is_read;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleMarkRead(n.id)}
                        className={`w-full text-left px-5 py-4 border-b border-[#EAE3D8]/50 hover:bg-[#FEF0DC]/30 transition-colors ${
                          isUnread ? "bg-[#FEF0DC]/10" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                              isUnread
                                ? "bg-primary/10 text-primary"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <i className="fa-solid fa-bell" />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-[13px] ${
                                isUnread
                                  ? "font-bold text-gray-900"
                                  : "font-medium text-gray-500"
                              }`}
                            >
                              {n.titre}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-gray-300 mt-1 block">
                              {new Date(n.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
