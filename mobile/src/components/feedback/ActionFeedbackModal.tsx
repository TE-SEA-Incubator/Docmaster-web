import React, { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Modal, Animated, Dimensions, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';

const SCREEN = Dimensions.get('window');

export type FeedbackType = 'success' | 'error' | 'warning';

export interface ActionFeedbackModalProps {
  visible: boolean;
  type: FeedbackType;
  title: string;
  message?: string;
  detail?: string;
  detailLabel?: string;
  primaryAction?: string;
  onPrimaryAction?: () => void;
  secondaryAction?: string;
  onSecondaryAction?: () => void;
  onDismiss?: () => void;
}

export function ActionFeedbackModal({
  visible,
  type,
  title,
  message,
  detail,
  detailLabel,
  primaryAction,
  onPrimaryAction,
  secondaryAction,
  onSecondaryAction,
  onDismiss,
}: ActionFeedbackModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = getStyles(colors, type);
  
  const ICON_CONFIG: Record<FeedbackType, { name: keyof typeof Ionicons.glyphMap; bg: string; color: string; ring: string }> = {
    success: { name: 'checkmark', bg: colors.success, color: colors.onPrimary, ring: colors.successBg },
    error: { name: 'close', bg: colors.danger, color: colors.onPrimary, ring: colors.dangerBg },
    warning: { name: 'alert', bg: colors.warning, color: colors.onPrimary, ring: colors.warningBg },
  };

  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(
        type === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : type === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning
      );
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 14, stiffness: 160, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(iconScale, { toValue: 1, damping: 10, stiffness: 180, useNativeDriver: true }).start();
      });
    } else {
      scaleAnim.setValue(0.6);
      opacityAnim.setValue(0);
      iconScale.setValue(0);
    }
  }, [visible]);

  const icon = ICON_CONFIG[type];

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={handleDismiss} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.backgroundElement,
              paddingBottom: insets.bottom + 24,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.iconContainer}>
            <View style={[styles.iconRing, { backgroundColor: icon.ring }]}>
              <Animated.View style={[styles.iconCircle, { backgroundColor: icon.bg, transform: [{ scale: iconScale }] }]}>
                <Ionicons name={icon.name} size={32} color={icon.color} />
              </Animated.View>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          ) : null}

          {detail ? (
            <View style={[styles.detailBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              {detailLabel ? (
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{detailLabel}</Text>
              ) : null}
              <Text style={[styles.detailValue, { color: colors.text }]}>{detail}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {secondaryAction && onSecondaryAction ? (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSecondaryAction(); }}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>{secondaryAction}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onPrimaryAction?.();
              }}
              style={({ pressed }) => [
                styles.primaryBtn,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>{primaryAction || 'Continuer'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ReturnType<typeof useThemeColors>, type: FeedbackType) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 28,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  detailBox: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: type === 'error' ? colors.danger : type === 'warning' ? colors.warning : colors.greenDark,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
