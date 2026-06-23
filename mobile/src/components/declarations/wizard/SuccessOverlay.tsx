import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Animated, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/common/Button';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';

type SuccessOverlayProps = {
  visible: boolean;
  reference: string;
  docLabel?: string;
  onClose: () => void;
};

export const SuccessOverlay: React.FC<SuccessOverlayProps> = ({
  visible,
  reference,
  docLabel,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }),
      ]).start();
    } else {
      scale.setValue(0.7);
      opacity.setValue(0);
      checkScale.setValue(0);
    }
  }, [visible]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `Ma déclaration de perte${docLabel ? ` (${docLabel})` : ''} a été soumise sur DocMaster.\nRéférence : ${reference}`,
    });
  };

  const handleViewDeclarations = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/declarations');
  };

  const handleNewDeclaration = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={[styles.backdrop, { backgroundColor: colors.overlayStrong }]}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }], paddingBottom: insets.bottom + 60, backgroundColor: colors.surface2 }]}>
          {/* Check icon */}
          <Animated.View style={[styles.iconCircle, { transform: [{ scale: checkScale }], backgroundColor: colors.success, shadowColor: colors.success }]}>
            <Ionicons name="checkmark" size={40} color={colors.onPrimary} />
          </Animated.View>

          <ThemedText style={[styles.title, { color: colors.text }]}>Déclaration envoyée !</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            {docLabel ? `Votre ${docLabel} a été déclaré perdu.` : 'Votre document a été déclaré perdu.'}
            {'\n'}Conservez votre référence.
          </ThemedText>

          {/* Reference box */}
          <View style={[styles.refBox, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
            <ThemedText style={[styles.refLabel, { color: colors.success }]}>Numéro de référence</ThemedText>
            <ThemedText style={[styles.refValue, { color: colors.success }]}>{reference}</ThemedText>
          </View>

          {/* Info note */}
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
            <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
              Gardez ce numéro pour suivre votre déclaration sur la plateforme.
            </ThemedText>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Voir mes déclarations"
              onPress={handleViewDeclarations}
              style={styles.primaryBtn}
            />
            <View style={styles.secondaryRow}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={16} color={colors.primary} />
                <ThemedText style={[styles.secondaryBtnText, { color: colors.primary }]}>Partager</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]} onPress={handleNewDeclaration} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <ThemedText style={[styles.secondaryBtnText, { color: colors.primary }]}>Nouvelle</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  refBox: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginVertical: 4,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  refValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    width: '100%',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
