import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Discreet banner that slides down when offline. Shows the number of
 * mutations waiting to sync so the user understands their writes are safe.
 */
export function OfflineBanner() {
  const { isOnline, pendingCount } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-60);

  useEffect(() => {
    translateY.value = withTiming(isOnline ? -60 : 0, { duration: 250 });
  }, [isOnline, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ paddingTop: insets.top }, style]}
      className="absolute inset-x-0 top-0 z-50 bg-green-dark"
    >
      <View className="flex-row items-center justify-center gap-2 px-4 py-2">
        <View className="h-2 w-2 rounded-full bg-primary" />
        <Text className="text-xs font-medium text-white">
          Mode hors-ligne
          {pendingCount > 0
            ? ` · ${pendingCount} en attente de synchronisation`
            : ""}
        </Text>
      </View>
    </Animated.View>
  );
}
