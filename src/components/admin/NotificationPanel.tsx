import { useI18n } from "../../context/I18nContext";
import LoadingSpinner from "../ui/LoadingSpinner";
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
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed top-0 bottom-0 right-0 z-50 w-full max-w-sm bg-white border-l border-gray-200 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-sm text-gray-900">{t("notification_title")}</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-[12px] font-semibold text-[#E8923A] hover:underline transition-colors">
                {t("notification_mark_all_read")}
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
              <i className="ph ph-x text-xs" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto admin-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <i className="ph ph-bell-slash text-2xl mb-3" />
              <p className="text-[13px] font-medium text-gray-400">{t("notification_empty")}</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.lue && !n.is_read;
              return (
                <button
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className={`w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isUnread ? "bg-[#FEF9F0]" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded border flex items-center justify-center text-xs shrink-0 ${isUnread ? "bg-[#E8923A]/10 border-[#E8923A]/20 text-[#E8923A]" : "bg-gray-100 border-gray-200 text-gray-400"}`}>
                      <i className="ph ph-bell" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] ${isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-500"}`}>{n.titre}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-gray-300 mt-1 block">
                        {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-[#E8923A] shrink-0 mt-2" />}
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
