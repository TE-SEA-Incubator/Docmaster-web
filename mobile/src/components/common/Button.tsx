import React, { useMemo } from 'react';
import { Pressable, StyleSheet, ActivityIndicator, type PressableProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../themed-text';
import { useThemeColors } from '@/hooks/useThemeColors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: React.ComponentProps<typeof ThemedText>['style'];
};

const getButtonStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 9999,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.success,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
});

function ButtonInner({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  ...rest
}: ButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;
  const isOutlined = variant === 'outline' || variant === 'ghost';
  const buttonStyles = useMemo(() => getButtonStyles(colors), [colors]);

  const palette = useMemo(() => {
    if (isDisabled) return { text: colors.textSecondary, tint: colors.textSecondary };
    if (isOutlined) {
      if (variant === 'ghost') return { text: colors.primary, tint: colors.primary };
      return { text: colors.text, tint: colors.text };
    }
    return { text: colors.onPrimary, tint: colors.onPrimary };
  }, [isDisabled, isOutlined, variant, colors]);

  const variantStyle = buttonStyles[variant] || buttonStyles.primary;

  return (
    <Pressable
      disabled={isDisabled}
      style={[
        buttonStyles.base,
        variantStyle,
        isDisabled && buttonStyles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.tint} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={18} color={palette.tint} />
          )}
          <ThemedText
            style={[
              { fontSize: 15, fontWeight: '700', color: palette.text },
              textStyle,
            ]}
          >
            {title}
          </ThemedText>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={18} color={palette.tint} />
          )}
        </>
      )}
    </Pressable>
  );
}

export const Button = React.memo(ButtonInner);
