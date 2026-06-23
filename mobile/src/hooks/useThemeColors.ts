import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/core/store/useThemeStore';

export type ThemeColors = typeof Colors.light | typeof Colors.dark;

export function useThemeColors(): ThemeColors {
  const mode = useThemeStore(state => state.mode);
  const scheme = useColorScheme();

  if (mode === 'system') {
    return Colors[(scheme === 'dark' ? 'dark' : 'light') as keyof typeof Colors];
  }
  return Colors[mode];
}
