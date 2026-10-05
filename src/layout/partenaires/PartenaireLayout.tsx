import { useState } from "react";
import { Typography, Space, Avatar, Dropdown, Button } from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation } from "react-router-dom";
import { usePartenaire } from "../../context/PartenaireContext";
import { useI18n } from "../../context/I18nContext";
import { partenairePalette } from "../../theme/partenaires";
import PartenaireDesignProvider from "../../components/partenaires/PartenaireDesignProvider";
import PartenaireSidebar from "../../components/partenaires/PartenaireSidebar";
import NotificationDropdown from "../../components/ui/NotificationDropdown";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";

export default function PartenaireLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { partenaire, logout } = usePartenaire();
  const { t } = useI18n();
  const location = useLocation();

  const selectedKey = (() => {
    if (location.pathname.includes("/rendre")) return "declarations";
    if (location.pathname.includes("/declarations")) return "declarations";
    if (location.pathname.includes("/declarer")) return "declarer";
    if (location.pathname.includes("/messagerie")) return "messagerie";
    if (location.pathname.includes("/portefeuille")) return "portefeuille";
    if (location.pathname.includes("/retraits")) return "retraits";
    if (location.pathname.includes("/profil")) return "profil";
    return "dashboard";
  })();

  const pageTitle = (() => {
    if (location.pathname.includes("/rendre")) return t("partenaire_layout_title_rendre");
    switch (selectedKey) {
      case "declarer": return t("partenaire_layout_title_declarer");
      case "declarations": return t("partenaire_layout_title_declarations");
      case "messagerie": return t("partenaire_layout_title_messagerie");
      case "portefeuille": return t("partenaire_layout_title_portefeuille");
      case "retraits": return t("partenaire_layout_title_retraits");
      case "profil": return t("partenaire_layout_title_profil");
      default: return t("partenaire_layout_title_dashboard");
    }
  })();

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: t("partenaire_layout_logout"),
        danger: true,
        onClick: () => logout(),
      },
    ],
  };

  return (
    <PartenaireDesignProvider>
      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: partenairePalette.bgMain,
          position: "relative",
        }}
      >
        {/* Decorative blob — mirrors main app background style (subtle texture) */}
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

        <PartenaireSidebar collapsed={collapsed} onCollapse={setCollapsed} />

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
              background: partenairePalette.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              borderBottom: `1px solid ${partenairePalette.border}`,
              boxShadow: "0 1px 3px rgba(18, 52, 60, 0.05)",
              flexShrink: 0,
            }}
          >
            <Space>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ color: partenairePalette.textMain }}
              />
              <Typography.Title level={5} style={{ margin: 0, color: partenairePalette.greenDark }}>
                {pageTitle}
              </Typography.Title>
            </Space>

            <Space size={12}>
              <LanguageSwitcher accentColor={partenairePalette.primary} />
              <NotificationDropdown accentColor={partenairePalette.primary} />

              <Dropdown menu={userMenu} placement="bottomRight">
                <Space style={{ cursor: "pointer" }} size={10}>
                  <Avatar style={{ background: partenairePalette.primary, fontWeight: 600 }} icon={<UserOutlined />}>
                    {(partenaire?.nom_organisation || "O").charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ lineHeight: 1.2 }}>
                    <Typography.Text strong style={{ color: partenairePalette.textMain, display: "block", fontSize: 13 }}>
                      {partenaire?.nom_organisation || ""}
                    </Typography.Text>
                    <Typography.Text style={{ color: partenairePalette.textMuted, fontSize: 11, display: "block" }}>
                      {partenaire?.email}
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
    </PartenaireDesignProvider>
  );
}
