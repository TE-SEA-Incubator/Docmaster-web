import { useState, useEffect, useRef } from "react";
import { useI18n } from "../../context/I18nContext";
import { useNotifications } from "../../hooks/useNotifications";
import { socketService } from "../../services/socket";

export default function NotificationModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, fetch } = useNotifications();
  const [liveNotifs, setLiveNotifs] = useState<any[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const notif = e.detail;
      setLiveNotifs((prev) => [notif, ...prev]);
    };
    window.addEventListener("docmaster:notification", handler as EventListener);
    return () => window.removeEventListener("docmaster:notification", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!socketService.connected) {
      socketService.init();
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const allNotifs = [
    ...liveNotifs.map((n: any) => ({ ...n, is_read: false, lue: false, _live: true })),
    ...notifications,
  ].slice(0, 20);

  const getMeta = (type?: string) => {
    switch (type) {
      case "MATCH_FOUND": case "match_found":
        return { icon: "fa-solid fa-handshake", bg: "bg-green-100", color: "text-green-700" };
      case "LOST_SUBMITTED": case "lost_submitted":
        return { icon: "fa-solid fa-file-circle-exclamation", bg: "bg-amber-50", color: "text-amber-600" };
      case "FOUND_SUBMITTED": case "found_submitted":
        return { icon: "fa-solid fa-hand-holding-heart", bg: "bg-blue-50", color: "text-blue-600" };
      case "DOC_ADDED": case "doc_added":
        return { icon: "fa-solid fa-shield-halved", bg: "bg-purple-50", color: "text-purple-600" };
      case "PAYMENT_RECEIVED": case "payment_received":
        return { icon: "fa-solid fa-money-bill-wave", bg: "bg-green-100", color: "text-green-700" };
      default:
        return { icon: "fa-solid fa-bell", bg: "bg-primary-light", color: "text-primary-dark" };
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return t("notification_recently");
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return t("notification_just_now");
    if (diff < 3600) return t("notification_min_ago").replace("{}", String(Math.floor(diff / 60)));
    if (diff < 86400) return t("notification_hour_ago").replace("{}", String(Math.floor(diff / 3600)));
    if (diff < 604800) return t("notification_day_ago").replace("{}", String(Math.floor(diff / 86400)));
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  return (
    <>
      {/* Overlay: hidden on mobile (full page), visible on desktop */}
      <div className="hidden md:block fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={panelRef}
        className="fixed z-[110] bg-white shadow-2xl overflow-hidden border border-borda
          md:right-0 md:top-0 md:h-full md:w-[420px] md:rounded-none md:animate-none md:translate-x-0
          inset-0 rounded-none flex flex-col
          animate-in slide-in-from-right"
        style={{
          animation: "notifSlideIn 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-borda flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] bg-primary-light flex items-center justify-center">
              <i className="fa-solid fa-bell text-primary text-sm" />
            </div>
            <div>
              <h2 className="font-bricolage text-[15px] font-bold text-textMain leading-tight">{t("notification_title")}</h2>
              <p className="text-[11px] text-textMuted">{unreadCount} {t("notification_unread")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {t("notification_mark_all_read")}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-textMuted hover:text-red-500 transition-colors"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 rounded-full border-3 border-borda border-t-primary animate-spin" />
            </div>
          ) : allNotifs.length === 0 ? (
            <div className="py-10 text-center text-textMuted">
              <i className="fa-regular fa-bell-slash text-3xl opacity-30 mb-3" />
              <p className="text-sm font-medium">{t("notification_empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-borda">
              {allNotifs.map((n: any, idx) => {
                const meta = getMeta(n.type || n.notification_type);
                const key = n.id || n._id || `notif-${idx}`;
                return (
                  <div
                    key={key}
                    onClick={() => { if (!n._live && !n.is_read && !n.lue) markAsRead(n.id); }}
                    className={`flex gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors cursor-pointer relative ${
                      !n.is_read && !n.lue ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    {!n.is_read && !n.lue && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                    <div className={`w-9 h-9 rounded-[9px] ${meta.bg} flex items-center justify-center text-sm flex-shrink-0`}>
                      <i className={`${meta.icon} ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-textMain leading-snug italic">
                        <strong>{n.title || n.titre || ""}</strong>{" "}
                        {n.message || ""}
                      </div>
                      <div className="text-[10.5px] text-textMuted font-medium italic mt-0.5">
                        {n._live ? t("notification_just_now") : formatTimeAgo(n.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-borda text-center flex-shrink-0">
          <button
            onClick={fetch}
            className="text-[11.5px] font-semibold text-primary hover:underline"
          >
            <i className="fa-solid fa-rotate mr-1" /> {t("notification_refresh")}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes notifSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
