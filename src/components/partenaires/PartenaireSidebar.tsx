import { Menu, Avatar, Typography, Button, Tooltip } from "antd";
import {
  ArrowDownOutlined,
  DashboardOutlined,
  FileProtectOutlined,
  LogoutOutlined,
  PlusCircleOutlined,
  ProfileOutlined,
  UserOutlined,
  ShopOutlined,
  StarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { usePartenaire } from "../../context/PartenaireContext";
import { useI18n } from "../../context/I18nContext";
import { partenairePalette } from "../../theme/partenaires";

interface PartenaireSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export default function PartenaireSidebar({ collapsed, onCollapse }: PartenaireSidebarProps) {
  const { partenaire, logout } = usePartenaire();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = (() => {
    if (location.pathname.includes("/declarations")) return "declarations";
    if (location.pathname.includes("/declarer")) return "declarer";
    if (location.pathname.includes("/portefeuille")) return "portefeuille";
    if (location.pathname.includes("/retraits")) return "retraits";
    if (location.pathname.includes("/profil")) return "profil";
    return "dashboard";
  })();

  const menuItems = [
    { key: "dashboard", icon: <DashboardOutlined />, label: t("partenaire_sidebar_dashboard") },
    { key: "declarer", icon: <PlusCircleOutlined />, label: t("partenaire_sidebar_declare") },
    { key: "declarations", icon: <FileProtectOutlined />, label: t("partenaire_sidebar_declarations") },
    { key: "portefeuille", icon: <WalletOutlined />, label: t("partenaire_sidebar_portefeuille") },
    { key: "retraits", icon: <ArrowDownOutlined />, label: t("partenaire_sidebar_retraits") },
    { key: "profil", icon: <ProfileOutlined />, label: t("partenaire_sidebar_profil") },
  ];

  const goTo = (key: string) => {
    if (key === "declarations") navigate("/partenaire/declarations");
    else if (key === "declarer") navigate("/partenaire/declarer");
    else if (key === "portefeuille") navigate("/partenaire/portefeuille");
    else if (key === "retraits") navigate("/partenaire/retraits");
    else if (key === "profil") navigate("/partenaire/profil");
    else navigate("/partenaire/dashboard");
  };

  const sidebarW = collapsed ? 80 : 240;

  return (
    <aside
      style={{
        width: sidebarW,
        minWidth: sidebarW,
        background: partenairePalette.greenDark,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          padding: collapsed ? "0" : "0 16px",
          borderBottom: `1px solid ${partenairePalette.greenMid}`,
          cursor: "pointer",
          flexShrink: 0,
        }}
        onClick={() => navigate("/partenaire/dashboard")}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: partenairePalette.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ShopOutlined style={{ color: "#fff", fontSize: 18 }} />
        </span>
        {!collapsed && (
          <div style={{ lineHeight: 1.1, overflow: "hidden", whiteSpace: "nowrap" }}>
            <Typography.Text strong style={{ color: "#FFFFFF", fontSize: 15, display: "block" }}>
              DocMaster
            </Typography.Text>
            <Typography.Text style={{ color: partenairePalette.primaryLight, fontSize: 11, display: "block" }}>
              {t("partenaire_sidebar_space")}
            </Typography.Text>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 8 }}>
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => goTo(key)}
          style={{ marginTop: 12, background: "transparent" }}
        />
      </div>

      {/* User card */}
      {!collapsed && partenaire && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${partenairePalette.greenMid}`,
            margin: "0 16px 16px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Avatar style={{ background: partenairePalette.primary, fontWeight: 600, fontSize: 12 }} icon={<UserOutlined />}>
              {(partenaire.nom_organisation || "O").charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <Typography.Text strong style={{ color: "#fff", fontSize: 12, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {partenaire.nom_organisation}
              </Typography.Text>
              <Typography.Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {partenaire.email}
              </Typography.Text>
            </div>
          </div>
          <Typography.Text
            strong
            style={{ color: "#fff", fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}
          >
            <WalletOutlined /> {t("partenaire_sidebar_balance", { amount: Number(partenaire.wallet_balance || 0).toLocaleString(lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR") })}
          </Typography.Text>
          <Typography.Text
            style={{ color: "#F5A64B", fontSize: 11, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}
          >
            <StarOutlined /> {t("partenaire_sidebar_points", { amount: Number(partenaire.points || 0).toLocaleString(lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR") })}
          </Typography.Text>
          <Button danger block size="small" icon={<LogoutOutlined />} onClick={() => logout()} style={{ fontWeight: 500 }}>
            {t("partenaire_sidebar_logout")}
          </Button>
        </div>
      )}

      {collapsed && (
        <div style={{ padding: "0 0 16px", display: "flex", justifyContent: "center" }}>
          <Tooltip title={t("partenaire_sidebar_logout")} placement="right">
            <Button danger type="text" icon={<LogoutOutlined />} onClick={() => logout()} />
          </Tooltip>
        </div>
      )}
    </aside>
  );
}
