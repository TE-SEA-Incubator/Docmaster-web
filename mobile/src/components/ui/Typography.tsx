import { Text, type TextProps } from "react-native";

import { cn } from "@/lib/cn";

type Variant = "h1" | "h2" | "h3" | "body" | "caption" | "label";

const VARIANTS: Record<Variant, string> = {
  h1: "text-3xl font-bold text-textMain",
  h2: "text-2xl font-bold text-textMain",
  h3: "text-lg font-semibold text-textMain",
  body: "text-base text-textMain",
  caption: "text-xs text-textMuted",
  label: "text-sm font-medium text-textMain",
};

export interface TypographyProps extends TextProps {
  variant?: Variant;
  className?: string;
}

/** Typed text primitive that maps a `variant` to brand Tailwind classes. */
export function Typography({
  variant = "body",
  className,
  ...props
}: TypographyProps) {
  return <Text className={cn(VARIANTS[variant], className)} {...props} />;
}
