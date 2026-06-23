import { View, type ViewProps } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export type ThemedViewProps = ViewProps & {
  type?: 'background' | 'backgroundElement' | 'backgroundSelected' | 'surface' | 'surface2';
};

export function ThemedView({ style, type, ...otherProps }: ThemedViewProps) {
  const colors = useThemeColors();
  const typeStyle = type ? { backgroundColor: colors[type] } : {};
  return <View style={[typeStyle, style]} {...otherProps} />;
}
