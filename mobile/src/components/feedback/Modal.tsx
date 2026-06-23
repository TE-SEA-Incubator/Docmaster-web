import { useEffect } from 'react';
import { Modal as RNModal, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export type ModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ visible, onClose, children }: ModalProps) {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, opacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.overlay, overlayStyle]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.contentWrapper}>
          <ThemedView type="surface" style={styles.content}>
            {children}
          </ThemedView>
        </View>
      </View>
    </RNModal>
  );
}

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  contentWrapper: {
    width: '85%',
    maxWidth: 400,
    zIndex: 1,
  },
  content: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
  },
});
