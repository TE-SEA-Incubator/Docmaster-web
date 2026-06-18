import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Haptic feedback is a progressive enhancement: it must never throw on
// platforms or devices where the hardware/API is unavailable (e.g. web).
const supported = Platform.OS === "ios" || Platform.OS === "android";

export function impact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
): void {
  if (!supported) return;
  Haptics.impactAsync(style).catch(() => undefined);
}

export function notify(type: Haptics.NotificationFeedbackType): void {
  if (!supported) return;
  Haptics.notificationAsync(type).catch(() => undefined);
}

export { Haptics };
