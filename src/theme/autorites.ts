import type { ThemeConfig } from "antd";

export const autoritePalette = {
  primary: "#E8923A",
  primaryDark: "#B06E1F",
  primaryLight: "#FEF0DC",
  greenDark: "#2D5A42",
  greenMid: "#2D5A42",
  greenLight: "#E8F5EE",
  bgMain: "#F4EFE6",
  surface: "#FFFFFF",
  textMain: "#1A1A1A",
  textMuted: "#6B7280",
  border: "#EAE3D8",
  danger: "#D9534F",
  success: "#2D5A42",
};

export const autoriteTheme: ThemeConfig = {
  token: {
    colorPrimary: autoritePalette.primary,
    colorInfo: autoritePalette.primary,
    colorSuccess: autoritePalette.success,
    colorWarning: autoritePalette.primary,
    colorError: autoritePalette.danger,
    colorBgLayout: autoritePalette.bgMain,
    colorBgContainer: autoritePalette.surface,
    colorBorder: autoritePalette.border,
    colorBorderSecondary: autoritePalette.border,
    colorText: autoritePalette.textMain,
    colorTextSecondary: autoritePalette.textMuted,
    borderRadius: 6,
    fontFamily: "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: autoritePalette.greenDark,
      headerColor: "#FFFFFF",
      siderBg: autoritePalette.greenDark,
      triggerBg: autoritePalette.greenMid,
      bodyBg: autoritePalette.bgMain,
      headerHeight: 64,
    },
    Menu: {
      darkItemBg: autoritePalette.greenDark,
      darkSubMenuItemBg: autoritePalette.greenDark,
      darkItemSelectedBg: autoritePalette.primary,
      darkItemHoverBg: autoritePalette.greenMid,
      darkItemColor: "rgba(255, 255, 255, 0.82)",
      darkItemHoverColor: "#FFFFFF",
      darkItemSelectedColor: "#FFFFFF",
      itemBorderRadius: 6,
      itemMarginInline: 8,
    },
    Button: {
      primaryShadow: "0 2px 6px rgba(217, 138, 48, 0.35)",
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: 10,
      boxShadowTertiary: "0 1px 4px rgba(26, 26, 26, 0.06)",
    },
    Table: {
      headerBg: autoritePalette.greenLight,
      headerColor: autoritePalette.greenDark,
      rowHoverBg: autoritePalette.primaryLight,
      borderColor: autoritePalette.border,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Tabs: {
      inkBarColor: autoritePalette.primary,
      itemSelectedColor: autoritePalette.primaryDark,
    },
  },
};
