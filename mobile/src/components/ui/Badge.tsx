import { Text, View } from "react-native";

import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE: Record<Tone, string> = {
  neutral: "bg-borderMain/50",
  success: "bg-green-light",
  warning: "bg-primary-light",
  danger: "bg-red-100",
  info: "bg-blue-100",
};

const TEXT: Record<Tone, string> = {
  neutral: "text-textMuted",
  success: "text-green-dark",
  warning: "text-primary-dark",
  danger: "text-danger",
  info: "text-blue-700",
};

export interface BadgeProps {
  label: string;
  tone?: Tone;
  className?: string;
}

export function Badge({ label, tone = "neutral", className }: BadgeProps) {
  return (
    <View className={cn("self-start rounded-full px-2.5 py-1", TONE[tone], className)}>
      <Text className={cn("text-xs font-semibold", TEXT[tone])}>{label}</Text>
    </View>
  );
}
