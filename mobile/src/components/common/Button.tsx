import React, { useMemo } from 'react';
import { Pressable, StyleSheet, ActivityIndicator, type PressableProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../themed-text';

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

const buttonStyles = StyleSheet.create({
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
    backgroundColor: '#F5A64B',
  },
  secondary: {
    backgroundColor: '#16A34A',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EAE3D8',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#EF4444',
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
  const isDisabled = disabled || loading;
  const isOutlined = variant === 'outline' || variant === 'ghost';

  const palette = useMemo(() => {
    if (isDisabled) return { text: '#9CA3AF', tint: '#9CA3AF' };
    if (isOutlined) {
      if (variant === 'ghost') return { text: '#F5A64B', tint: '#F5A64B' };
      return { text: '#1A1A1A', tint: '#1A1A1A' };
    }
    return { text: '#FFFFFF', tint: '#FFFFFF' };
  }, [isDisabled, isOutlined, variant]);

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
