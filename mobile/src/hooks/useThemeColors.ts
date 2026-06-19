import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export type ThemeColors = typeof Colors.light;

/**
 * Returns the active theme color palette. Falls back to light when the system
 * reports 'unspecified' (e.g. on web pre-hydration). Use this in every screen
 * so the app adapts to the phone's light/dark preference.
 */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return Colors[(scheme === 'dark' ? 'dark' : 'light') as keyof typeof Colors];
}
