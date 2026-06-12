import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
} from "react-native";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const CONTAINER: Record<Variant, string> = {
  primary: "bg-green-dark active:bg-green-mid",
  secondary: "bg-primary active:bg-primary-dark",
  ghost: "bg-transparent active:bg-borderMain/40",
  danger: "bg-danger active:opacity-90",
};

const LABEL: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-white",
  ghost: "text-textMain",
  danger: "text-white",
};

const SIZE: Record<Size, string> = {
  sm: "h-10 px-4",
  md: "h-12 px-5", // 48px — the design system's standard control height.
  lg: "h-14 px-6",
};

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  /** Adds a touch margin so the thumb target is comfortably large. */
  haptic?: boolean;
  className?: string;
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = true,
  leftIcon,
  haptic = true,
  disabled,
  onPress,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={8}
      onPress={(e) => {
        if (haptic) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(e);
      }}
      className={cn(
        "flex-row items-center justify-center rounded-xl",
        SIZE[size],
        CONTAINER[variant],
        fullWidth && "w-full",
        isDisabled && "opacity-50",
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? "#1A1A1A" : "#FFFFFF"} />
      ) : (
        <View className="flex-row items-center gap-2">
          {leftIcon}
          <Text className={cn("text-base font-semibold", LABEL[variant])}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
