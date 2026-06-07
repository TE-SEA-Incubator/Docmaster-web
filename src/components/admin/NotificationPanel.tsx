import { useI18n } from "../../context/I18nContext";
import type { Notification } from "../../types/api";

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

export default function NotificationPanel({ open, onClose, notifications, loading, unreadCount, onMarkAllRead, onMarkRead }: NotificationPanelProps) {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white border-l border-[#EAE3D8] shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE3D8]">
          <h3 className="font-bricolage font-bold text-gray-900">{t("notification_title")}</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-[11px] font-bold text-primary hover:text-primary-dark transition-colors">
                {t("notification_mark_all_read")}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#EAE3D8] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-[3px] border-gray-200 border-t-primary animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <i className="fa-solid fa-bell-slash text-3xl mb-4" />
              <p className="text-[13px] font-medium text-gray-400">{t("notification_empty")}</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.lue && !n.is_read;
              return (
                <button
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className={`w-full text-left px-5 py-4 border-b border-[#EAE3D8]/50 hover:bg-[#FEF0DC]/30 transition-colors ${isUnread ? "bg-[#FEF0DC]/10" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${isUnread ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"}`}>
                      <i className="fa-solid fa-bell" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[13px] ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-500"}`}>{n.titre}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-gray-300 mt-1 block">
                        {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
