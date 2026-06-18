import { useEffect } from "react";
import { View, type ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { cn } from "@/lib/cn";

export interface SkeletonProps extends ViewProps {
  className?: string;
}

/** Pulsing placeholder used for loading states. */
export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[animatedStyle, style]}
      className={cn("rounded-xl bg-borderMain", className)}
      {...props}
    />
  );
}

export function DocumentCardSkeleton() {
  return (
    <View className="mb-3 rounded-2xl border border-borderMain bg-surface p-4">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-3 h-3 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </View>
  );
}
