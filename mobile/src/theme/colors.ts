/**
 * Brand palette shared with NativeWind (tailwind.config.js).
 * Use these constants when you need a raw color value (e.g. for
 * native props like `tintColor`, status bar, gradients) instead of a
 * Tailwind class.
 */
export const colors = {
  primary: "#F5A64B",
  primaryDark: "#D98A30",
  primaryLight: "#FEF0DC",
  greenDark: "#1E3A2F",
  greenMid: "#2D5A42",
  greenLight: "#E8F5EE",
  bgMain: "#F4EFE6",
  surface: "#FFFFFF",
  surface2: "#FAF7F2",
  textMain: "#1A1A1A",
  textMuted: "#6B7280",
  borderMain: "#EAE3D8",
  danger: "#DC2626",
  success: "#16A34A",
  warning: "#D97706",
} as const;

export type ColorName = keyof typeof colors;
