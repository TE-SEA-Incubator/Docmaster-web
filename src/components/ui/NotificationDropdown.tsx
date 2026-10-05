import { useState, useEffect, useRef } from "react";
import { Popover, Badge } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useNotifications } from "../../hooks/useNotifications";
import { socketService } from "../../services/socket";
import { useI18n } from "../../context/I18nContext";

interface NotificationDropdownProps {
  accentColor: string;
  service?: {
    getAll: () => Promise<any>;
    markAsRead: (id: string) => Promise<any>;
    markAllAsRead: () => Promise<any>;
  };
}

const TYPE_META: Record<string, { icon: string; bg: string; color: string }> = {
  MATCH_FOUND: { icon: "fa-solid fa-handshake", bg: "#dcfce7", color: "#16a34a" },
  match_found: { icon: "fa-solid fa-handshake", bg: "#dcfce7", color: "#16a34a" },
  LOST_SUBMITTED: { icon: "fa-solid fa-file-circle-exclamation", bg: "#fef3c7", color: "#d97706" },
  lost_submitted: { icon: "fa-solid fa-file-circle-exclamation", bg: "#fef3c7", color: "#d97706" },
  FOUND_SUBMITTED: { icon: "fa-solid fa-hand-holding-heart", bg: "#dbeafe", color: "#2563eb" },
  found_submitted: { icon: "fa-solid fa-hand-holding-heart", bg: "#dbeafe", color: "#2563eb" },
  DOC_ADDED: { icon: "fa-solid fa-shield-halved", bg: "#f3e8ff", color: "#7c3aed" },
  doc_added: { icon: "fa-solid fa-shield-halved", bg: "#f3e8ff", color: "#7c3aed" },
  PAYMENT_RECEIVED: { icon: "fa-solid fa-money-bill-wave", bg: "#dcfce7", color: "#16a34a" },
  payment_received: { icon: "fa-solid fa-money-bill-wave", bg: "#dcfce7", color: "#16a34a" },
  VAULT_MATCH_PENDING: { icon: "fa-solid fa-file-search", bg: "#fef3c7", color: "#d97706" },
  vault_match_pending: { icon: "fa-solid fa-file-search", bg: "#fef3c7", color: "#d97706" },
  NEW_DECLARATION_ZONE: { icon: "fa-solid fa-location-dot", bg: "#dbeafe", color: "#2563eb" },
  new_declaration_zone: { icon: "fa-solid fa-location-dot", bg: "#dbeafe", color: "#2563eb" },
  CERTIFICATION_DONE: { icon: "fa-solid fa-certificate", bg: "#dcfce7", color: "#16a34a" },
  certification_done: { icon: "fa-solid fa-certificate", bg: "#dcfce7", color: "#16a34a" },
  DECLARATION_CERTIFIED: { icon: "fa-solid fa-certificate", bg: "#dcfce7", color: "#16a34a" },
  declaration_certified: { icon: "fa-solid fa-certificate", bg: "#dcfce7", color: "#16a34a" },
  WALLET_ADJUSTMENT: { icon: "fa-solid fa-wallet", bg: "#fef3c7", color: "#d97706" },
  wallet_adjustment: { icon: "fa-solid fa-wallet", bg: "#fef3c7", color: "#d97706" },
};

const meta = (type?: string) => TYPE_META[type || ""] || { icon: "fa-solid fa-bell", bg: accentBg(), color: "#1f7a8c" };

function accentBg() {
  return "#E0F2F5";
}

export default function NotificationDropdown({ accentColor, service }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(service);
  const { t, lang } = useI18n();
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";
  const [liveNotifs, setLiveNotifs] = useState<any[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return t("notification_recently");
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return t("notification_just_now");
    if (diff < 3600) return t("notification_time_min", { count: Math.floor(diff / 60) });
    if (diff < 86400) return t("notification_time_hour", { count: Math.floor(diff / 3600) });
    if (diff < 604800) return t("notification_time_day", { count: Math.floor(diff / 86400) });
    return new Date(dateString).toLocaleDateString(localeTag);
  };

  useEffect(() => {
    if (!socketService.connected) {
      socketService.init();
    }
    const handler = (e: any) => {
      setLiveNotifs((prev) => [e.detail, ...prev]);
    };
    window.addEventListener("docmaster:notification", handler as EventListener);
    return () => window.removeEventListener("docmaster:notification", handler as EventListener);
  }, []);

  const allNotifs = [
    ...liveNotifs.map((n: any) => ({ ...n, is_read: false, lue: false, _live: true })),
    ...notifications,
  ].slice(0, 20);

  const content = (
    <div
      ref={panelRef}
      style={{
        width: 380,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: 520,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 10px 40px rgba(18, 52, 60, 0.18)",
        border: "1px solid #EAE3D8",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #EAE3D8",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "#FEF0DC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="fa-solid fa-bell" style={{ color: accentColor || "#E8923A", fontSize: 12 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1A1A1A", lineHeight: 1.1 }}>{t("notification_title")}</div>
            <div style={{ fontSize: 10.5, color: "#6B7280" }}>{t("notification_unread_count", { count: unreadCount })}</div>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            style={{
              background: "transparent",
              border: "none",
              color: accentColor || "#E8923A",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("notification_mark_all")}
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {allNotifs.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#6B7280" }}>
            <i className="fa-regular fa-bell-slash" style={{ fontSize: 24, opacity: 0.4, display: "block", marginBottom: 8 }} />
            <div style={{ fontSize: 12, fontWeight: 500 }}>{t("notification_empty")}</div>
          </div>
        ) : (
          allNotifs.map((n: any, idx: number) => {
            const m = meta(n.type || n.notification_type);
            const key = n.id || n._id || `notif-${idx}`;
            const isUnread = !n.is_read && !n.lue;
            return (
              <div
                key={key}
                onClick={() => {
                  if (!n._live && isUnread && n.id) markAsRead(n.id);
                }}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 14px",
                  borderBottom: idx < allNotifs.length - 1 ? "1px solid #EAE3D8" : "none",
                  background: isUnread ? "rgba(217, 138, 48, 0.04)" : "transparent",
                  cursor: n._live ? "default" : "pointer",
                  position: "relative",
                }}
              >
                {isUnread && (
                  <div
                    style={{
                      position: "absolute",
                      left: 4,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: accentColor || "#E8923A",
                    }}
                  />
                )}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: m.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <i className={m.icon} style={{ color: m.color, fontSize: 12 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#1A1A1A", lineHeight: 1.35 }}>
                    <strong>{n.title || n.titre || ""}</strong> {n.message || ""}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#6B7280", marginTop: 4, fontStyle: "italic" }}>
                    {n._live ? t("notification_just_now") : formatTimeAgo(n.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      overlayInnerStyle={{ padding: 0 }}
      destroyTooltipOnHide
    >
      <button
        aria-label={t("notification_title")}
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "transparent",
          border: "1px solid transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          color: "#1A1A1A",
        }}
      >
        <BellOutlined style={{ fontSize: 16 }} />
        {unreadCount > 0 && (
          <Badge
            count={unreadCount > 9 ? "9+" : unreadCount}
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              background: "#ef4444",
              boxShadow: "0 0 0 2px #fff",
              fontSize: 9,
              height: 16,
              minWidth: 16,
              lineHeight: "16px",
            }}
          />
        )}
      </button>
    </Popover>
  );
}
