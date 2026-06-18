import { forwardRef, useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    containerClassName,
    onFocus,
    onBlur,
    className,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn("w-full", containerClassName)}>
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-textMain">{label}</Text>
      ) : null}

      <View
        className={cn(
          "h-12 flex-row items-center rounded-xl border bg-surface px-3",
          focused ? "border-green-mid" : "border-borderMain",
          error && "border-danger",
        )}
      >
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          className="flex-1 text-base text-textMain"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </View>

      {error ? (
        <Text className="mt-1 text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="mt-1 text-xs text-textMuted">{hint}</Text>
      ) : null}
    </View>
  );
});
