import React from 'react';
import {
  View, StyleSheet, TouchableOpacity, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PRIMARY, TEXT_MAIN, TEXT_MUTED, BORDER, CREAM } from './DOC_TYPE_META';

type WizardTopBarProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  showClose?: boolean;
};

export function WizardTopBar({
  title,
  subtitle,
  onBack,
  onClose,
  showClose = true,
}: WizardTopBarProps) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack?.();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose?.();
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 4 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={CREAM} />
      <View style={styles.row}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack} activeOpacity={0.7} disabled={!onBack}>
          {onBack ? (
            <Ionicons name="chevron-back" size={22} color={TEXT_MAIN} />
          ) : (
            <View style={{ width: 36 }} />
          )}
        </TouchableOpacity>

        <View style={styles.center}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>

        {showClose ? (
          <TouchableOpacity style={styles.iconBtn} onPress={handleClose} activeOpacity={0.7}>
            <View style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={TEXT_MUTED} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: CREAM,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    minHeight: 48,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EAE3D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_MAIN,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
    fontWeight: '500',
  },
});
