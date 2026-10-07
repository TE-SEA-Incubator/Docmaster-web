import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useNotifications } from "../../hooks/useNotifications";
import { socketService } from "../../services/socket";
import { notificationsService } from "../../services/notificationsService";
import { emitToast } from "../../utils/toastEmitter";
import { matchRecoveryTarget } from "../../utils/notificationTargets";
import SmsAlertUpsell from "../subscription/SmsAlertUpsell";

const MATCH_TYPES = [
  "MATCH_FOUND", "match_found",
  "MATCH_POTENTIAL", "match_potential",
  "VAULT_MATCH_PENDING", "vault_match_pending",
];

export default function NotificationModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
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

  const [respondingId, setRespondingId] = useState<string | null>(null);

  const parseMetadata = (raw: unknown): Record<string, any> => {
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw as Record<string, any>;
  };

  const allNotifs = [
    ...liveNotifs.map((n: any) => ({ ...n, is_read: false, lue: false, _live: true })),
    ...notifications,
  ].slice(0, 20);

  const firstMatchIdx = allNotifs.findIndex(
    (n: any) => MATCH_TYPES.includes(String(n.type || n.notification_type))
  );

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
      case "VAULT_MATCH_PENDING": case "vault_match_pending":
        return { icon: "fa-solid fa-file-search", bg: "bg-amber-50", color: "text-amber-600" };
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
        className="notif-panel fixed z-[110] bg-white shadow-2xl overflow-hidden border border-borda
          top-0 bottom-0 w-full md:w-[420px] md:rounded-none
          rounded-none flex flex-col"
        style={{
          right: 0,
          left: "auto",
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
                const typeMeta = getMeta(n.type || n.notification_type);
                const key = n.id || n._id || `notif-${idx}`;
                const nType = n.type || n.notification_type;
                const isMatchNotif = MATCH_TYPES.includes(String(nType));
                const notifMeta = parseMetadata(n.metadata);
                const isVaultMatch = nType === "VAULT_MATCH_PENDING" || nType === "vault_match_pending";
                const isResponding = respondingId === key;

                const handleVaultResponse = async (response: "yes" | "no") => {
                  setRespondingId(key);
                  try {
                    const result = await notificationsService.respondVaultMatch(
                      notifMeta.declaration_id,
                      response,
                      notifMeta.vault_doc_id
                    );
                    if (!n._live && !n.is_read && !n.lue) markAsRead(n.id);

                    if (response === "yes" && result?.success) {
                      const lostId = (result as any).lost_declaration_id;
                      const foundId = (result as any).found_declaration_id || notifMeta.declaration_id;
                      emitToast({ type: "success", message: result.message || "Correspondance confirmée." });
                      onClose();
                      if (lostId) {
                        navigate(`/recuperer?id=${lostId}${foundId ? `&found=${foundId}` : ""}`);
                      }
                    } else if (response === "no" && result?.success) {
                      emitToast({ type: "success", message: result.message || "Réponse enregistrée." });
                    }
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || "Impossible de traiter votre réponse.";
                    emitToast({ type: "error", message: msg });
                  } finally {
                    setRespondingId(null);
                  }
                };

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (isVaultMatch) return;
                      if (!n._live && !n.is_read && !n.lue) markAsRead(n.id);
                      const recoveryTarget = matchRecoveryTarget(nType, notifMeta);
                      if (recoveryTarget) {
                        onClose();
                        navigate(recoveryTarget);
                      }
                    }}
                    className={`flex gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors relative ${
                      !isVaultMatch ? "cursor-pointer" : ""
                    } ${!n.is_read && !n.lue ? "bg-primary/[0.02]" : ""}`}
                  >
                    {!n.is_read && !n.lue && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                    <div className={`w-9 h-9 rounded-[9px] ${typeMeta.bg} flex items-center justify-center text-sm flex-shrink-0`}>
                      <i className={`${typeMeta.icon} ${typeMeta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-textMain leading-snug italic">
                        <strong>{n.title || n.titre || ""}</strong>{" "}
                        {n.message || ""}
                      </div>
                      <div className="text-[10.5px] text-textMuted font-medium italic mt-0.5">
                        {n._live ? t("notification_just_now") : formatTimeAgo(n.created_at)}
                      </div>
                      {isVaultMatch && (
                        <div className="flex gap-2 mt-2.5">
                          <button
                            disabled={isResponding}
                            onClick={(e) => { e.stopPropagation(); handleVaultResponse("yes"); }}
                            className="flex-1 py-1.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-[11px] font-bold rounded-[8px] transition-all active:scale-[.97]"
                          >
                            {isResponding ? <i className="fa-solid fa-spinner fa-spin" /> : "Oui, c'est le mien"}
                          </button>
                          <button
                            disabled={isResponding}
                            onClick={(e) => { e.stopPropagation(); handleVaultResponse("no"); }}
                            className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-textMuted text-[11px] font-bold rounded-[8px] transition-all active:scale-[.97]"
                          >
                            Non, ce n'est pas le mien
                          </button>
                        </div>
                      )}
                      {isMatchNotif && idx === firstMatchIdx && (
                        <div className="mt-2.5">
                          <SmsAlertUpsell spot="notifications" />
                        </div>
                      )}
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
        .notif-panel {
          animation: notifSlideIn 0.3s ease-out;
        }
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
