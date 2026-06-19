/**
 * Below are the colors that are used in the app.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#F4EFE6',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FAF7F2',
    textSecondary: '#6B7280',
    tint: '#F5A64B',
    border: '#EAE3D8',
    surface: '#FFFFFF',
    surface2: '#FAF7F2',
    tabActive: '#F5A64B',
    tabInactive: '#9CA3AF',
    headerBg: '#FFFFFF',
    headerBorder: '#F0F0F0',
    inputBg: '#FAF7F2',
    skeleton: '#F0EBE2',
    primary: '#F5A64B',
    onPrimary: '#FFFFFF',
    success: '#16A34A',
    successBg: '#F0FDF4',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    info: '#3B82F6',
    infoBg: '#EFF6FF',
    purple: '#7C3AED',
    purpleBg: '#F5F3FF',
    greenDark: '#1E3A2F',
  },
  dark: {
    text: '#F4EFE6',
    background: '#0F0F0F',
    backgroundElement: '#1F1F1F',
    backgroundSelected: '#2A2A2A',
    textSecondary: '#9CA3AF',
    tint: '#D98A30',
    border: '#2A2A2A',
    surface: '#1A1A1A',
    surface2: '#222222',
    tabActive: '#F5A64B',
    tabInactive: '#6B7280',
    headerBg: '#161616',
    headerBorder: '#262626',
    inputBg: '#222222',
    skeleton: '#262626',
    primary: '#F5A64B',
    onPrimary: '#1A1A1A',
    success: '#22C55E',
    successBg: '#0F2A1A',
    danger: '#F87171',
    dangerBg: '#2A1414',
    warning: '#FBBF24',
    warningBg: '#2A1F0A',
    info: '#60A5FA',
    infoBg: '#0E1F38',
    purple: '#A78BFA',
    purpleBg: '#1F1736',
    greenDark: '#0F2A1A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospaced',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// Minimum top inset for the tab bar (the floating button + status padding).
// The system bottom inset (gesture bar / nav bar) is added at runtime via useSafeAreaInsets.
export const BottomTabInset = Platform.select({ ios: 50, android: 12 }) ?? 0;
// Extra reserved space at the bottom of scroll containers so content never sits
// underneath the floating tab bar. Use with insets.bottom for full clearance.
export const TabBarClearance = Platform.select({ ios: 96, android: 90 }) ?? 90;
export const MaxContentWidth = 800;
