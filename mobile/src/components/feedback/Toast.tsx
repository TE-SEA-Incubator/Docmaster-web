import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing } from '@/constants/theme';

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastProps = {
  message: string;
  variant?: ToastVariant;
  visible: boolean;
  onHide: () => void;
  duration?: number;
};

export function Toast({ message, variant = 'info', visible, onHide, duration = 3000 }: ToastProps) {
  const colors = useThemeColors();
  const translateY = useSharedValue(-100);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      const timer = setTimeout(() => {
        translateY.value = withTiming(-100, { duration: 300 });
        setTimeout(onHide, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const variantColor = {
    success: colors.success,
    error: colors.danger,
    info: colors.textSecondary,
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.backgroundElement, borderLeftColor: variantColor[variant] },
        animatedStyle,
      ]}
    >
      <ThemedText>{message}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: Spacing.three,
    right: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderLeftWidth: 4,
    zIndex: 1000,
  },
});
