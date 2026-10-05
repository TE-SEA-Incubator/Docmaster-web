import { useState } from "react";
import { Typography, Space, Avatar, Dropdown, Button } from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation } from "react-router-dom";
import { useAutorite } from "../../context/AutoriteContext";
import { useI18n } from "../../context/I18nContext";
import { autoritePalette } from "../../theme/autorites";
import AutoriteDesignProvider from "../../components/autorites/AutoriteDesignProvider";
import AutoriteSidebar from "../../components/autorites/AutoriteSidebar";
import NotificationDropdown from "../../components/ui/NotificationDropdown";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import { autoritesService } from "../../services/autoritesService";

const AUTORITE_NOTIF_SERVICE = {
  getAll: () => autoritesService.getNotifications().then((r) => r.data),
  markAsRead: (id: string) => autoritesService.markNotificationRead(id),
  markAllAsRead: () => autoritesService.markAllNotificationsRead(),
};

export default function AutoriteLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { autorite, logout } = useAutorite();
  const { t } = useI18n();
  const location = useLocation();

  const selectedKey = (() => {
    if (location.pathname.includes("/declarations")) return "declarations";
    if (location.pathname.includes("/autorites")) return "autorites";
    if (location.pathname.includes("/journal")) return "journal";
    return "dashboard";
  })();

  const pageTitle = (() => {
    switch (selectedKey) {
      case "declarations": return t("autorite_layout_title_declarations");
      case "autorites": return t("autorite_layout_title_autorites");
      case "journal": return t("autorite_layout_title_journal");
      default: return t("autorite_layout_title_dashboard");
    }
  })();

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: t("autorite_layout_logout"),
        danger: true,
        onClick: () => logout(),
      },
    ],
  };

  return (
    <AutoriteDesignProvider>
      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: autoritePalette.bgMain,
          position: "relative",
        }}
      >
        {/* Decorative blobs — match main app background */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 520,
              height: 520,
              borderRadius: "50%",
              background: "rgba(168, 203, 175, 0.18)",
              filter: "blur(80px)",
              top: -180,
              right: -160,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 420,
              height: 420,
              borderRadius: "50%",
              background: "rgba(232, 184, 154, 0.16)",
              filter: "blur(80px)",
              bottom: -160,
              left: -120,
            }}
          />
        </div>

        <AutoriteSidebar collapsed={collapsed} onCollapse={setCollapsed} />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Header */}
          <header
            style={{
              height: 64,
              background: autoritePalette.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              borderBottom: `1px solid ${autoritePalette.border}`,
              boxShadow: "0 1px 3px rgba(26,26,26,0.05)",
              flexShrink: 0,
            }}
          >
            <Space>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ color: autoritePalette.textMain }}
              />
              <Typography.Title level={5} style={{ margin: 0, color: autoritePalette.greenDark }}>
                {pageTitle}
              </Typography.Title>
            </Space>

            <Space size={12}>
              <LanguageSwitcher accentColor={autoritePalette.primary} />
              <NotificationDropdown accentColor={autoritePalette.primary} service={AUTORITE_NOTIF_SERVICE} />

              <Dropdown menu={userMenu} placement="bottomRight">
                <Space style={{ cursor: "pointer" }} size={10}>
                  <Avatar style={{ background: autoritePalette.primary, fontWeight: 600 }} icon={<UserOutlined />}>
                    {autorite ? `${(autorite.prenom || "").charAt(0)}${(autorite.nom || "").charAt(0)}`.toUpperCase() : ""}
                  </Avatar>
                  <div style={{ lineHeight: 1.2 }}>
                    <Typography.Text strong style={{ color: autoritePalette.textMain, display: "block", fontSize: 13 }}>
                      {autorite ? `${autorite.prenom} ${autorite.nom}` : ""}
                    </Typography.Text>
                    <Typography.Text style={{ color: autoritePalette.textMuted, fontSize: 11, display: "block" }}>
                      {autorite?.email}
                    </Typography.Text>
                  </div>
                </Space>
              </Dropdown>
            </Space>
          </header>

          {/* Content */}
          <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
            <Outlet />
          </main>
        </div>
      </div>
    </AutoriteDesignProvider>
  );
}
