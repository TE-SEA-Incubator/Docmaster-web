import { View, type ViewProps } from "react-native";

import { cn } from "@/lib/cn";

export interface CardProps extends ViewProps {
  className?: string;
}

/** Surface container with the app's standard radius, border and padding. */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <View
      className={cn(
        "rounded-2xl border border-borderMain bg-surface p-4",
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}
