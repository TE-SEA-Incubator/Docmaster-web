import { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width } = Dimensions.get('window');
const LOGO_SIZE = width * 0.4;

type AppSplashProps = {
  onFinish: () => void;
};

export function AppSplash({ onFinish }: AppSplashProps) {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);

  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 500 });

    const bounce = (delay: number) =>
      withDelay(delay, withRepeat(withSequence(
        withTiming(-8, { duration: 300 }),
        withTiming(0, { duration: 300 }),
      ), -1, true));

    dot1.value = bounce(1000);
    dot2.value = bounce(1150);
    dot3.value = bounce(1300);

    const timer = setTimeout(() => onFinish(), 1800);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({ translateY: dot1.value }));
  const dot2Style = useAnimatedStyle(() => ({ translateY: dot2.value }));
  const dot3Style = useAnimatedStyle(() => ({ translateY: dot3.value }));

  return (
    <View style={styles.container}>
      <Animated.View style={logoStyle}>
        <Image
          source={require('../../assets/docmaster.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
        <Animated.View style={[styles.dot, dot3Style]} />
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 64,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});
