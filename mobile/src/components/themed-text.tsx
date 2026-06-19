import { StyleSheet, Text, type TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
};

export const typeStyles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '600' },
  subtitle: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  link: { fontSize: 14, lineHeight: 30 },
  linkPrimary: { fontSize: 14, lineHeight: 30, color: '#F5A64B' },
  code: { fontSize: 12, fontFamily: 'monospace' },
});

export function ThemedText({ type = 'default', style, ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[typeStyles[type], style]}
      {...rest}
    />
  );
}
