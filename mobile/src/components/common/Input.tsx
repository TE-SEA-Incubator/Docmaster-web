import React, { useState, useCallback, useMemo } from 'react';
import { View, TextInput, Pressable, StyleSheet, type TextInputProps, type NativeSyntheticEvent, type TextInputFocusEventData, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../themed-text';
import { useThemeColors } from '@/hooks/useThemeColors';

export type InputProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  containerStyle?: ViewStyle;
};

const getInputStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElement,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  inputWrapperDefault: {
    borderColor: colors.border,
  },
  inputWrapperFocused: {
    borderColor: colors.tint,
    backgroundColor: colors.backgroundElement,
  },
  inputWrapperError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  iconContainer: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
    lineHeight: 20,
  },
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginLeft: 8,
  },
});

function InputInner({
  label,
  icon,
  error,
  secureTextEntry,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const colors = useThemeColors();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputStyles = useMemo(() => getInputStyles(colors), [colors]);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(prev => !prev);
  }, []);

  const handleFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    onBlur?.(e);
  }, [onBlur]);

  const isSecure = secureTextEntry && !isPasswordVisible;

  const wrapperStyle = useMemo(() => {
    if (error) return inputStyles.inputWrapperError;
    if (isFocused) return inputStyles.inputWrapperFocused;
    return inputStyles.inputWrapperDefault;
  }, [error, isFocused]);

  const iconColor = error ? colors.danger : isFocused ? colors.tint : colors.textSecondary;

  return (
    <View style={[inputStyles.container, containerStyle]}>
      {label && (
        <ThemedText style={inputStyles.label}>
          {label}
        </ThemedText>
      )}
      <View style={[inputStyles.inputWrapper, wrapperStyle]}>
        {icon && (
          <View style={inputStyles.iconContainer}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
        )}
        <TextInput
          style={[inputStyles.textInput, style]}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.textSecondary}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable onPress={togglePasswordVisibility} style={inputStyles.passwordToggle}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {error && (
        <ThemedText style={inputStyles.errorText}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

export const Input = React.memo(InputInner);
