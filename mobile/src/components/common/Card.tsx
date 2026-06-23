import React from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export type CardProps = PressableProps & {
  children: React.ReactNode;
  style?: ViewStyle;
};

function CardInner({ children, style, ...rest }: CardProps) {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  return (
    <Pressable {...rest}>
      <ThemedView type="backgroundElement" style={[styles.card, style]}>
        {children}
      </ThemedView>
    </Pressable>
  );
}

export const Card = React.memo(CardInner);

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    borderColor: colors.border,
    borderWidth: 1,
  },
});
