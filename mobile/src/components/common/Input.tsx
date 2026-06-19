import React, { useState, useCallback, useMemo } from 'react';
import { View, TextInput, Pressable, StyleSheet, type TextInputProps, type NativeSyntheticEvent, type TextInputFocusEventData, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../themed-text';

export type InputProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  containerStyle?: ViewStyle;
};

const inputStyles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  inputWrapperDefault: {
    borderColor: '#EAE3D8',
  },
  inputWrapperFocused: {
    borderColor: '#F5A64B',
    backgroundColor: '#FFFFFF',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  iconContainer: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    height: '100%',
    lineHeight: 20,
  },
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    color: '#EF4444',
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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

  const iconColor = error ? '#EF4444' : isFocused ? '#F5A64B' : '#6B7280';

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
          placeholderTextColor="#9CA3AF"
          {...rest}
        />
        {secureTextEntry && (
          <Pressable onPress={togglePasswordVisibility} style={inputStyles.passwordToggle}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6B7280"
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
