import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';

type DeclarationTypePickerProps = {
  selected: 'self' | 'other' | null;
  onSelect: (type: 'self' | 'other') => void;
};

export const DeclarationTypePicker: React.FC<DeclarationTypePickerProps> = ({ selected, onSelect }) => {
  const colors = useThemeColors();
  const handleSelect = (type: 'self' | 'other') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(type);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundElement }, selected === 'self' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
        onPress={() => handleSelect('self')}
        activeOpacity={0.8}
      >
        <View style={[styles.iconRing, { backgroundColor: colors.warningBg }, selected === 'self' && styles.iconRingSelected]}>
          <Ionicons name="person-outline" size={28} color={selected === 'self' ? colors.onPrimary : colors.primary} />
        </View>
        <ThemedText style={[styles.title, { color: colors.text }, selected === 'self' && { color: colors.onPrimary }]}>
          Pour moi-même
        </ThemedText>
        <ThemedText style={[styles.desc, { color: colors.textSecondary }, selected === 'self' && { color: colors.glassTintStrong }]}>
          Je déclare la perte de mon propre document
        </ThemedText>
        {selected === 'self' && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundElement }, selected === 'other' && { backgroundColor: colors.purple, borderColor: colors.purple }]}
        onPress={() => handleSelect('other')}
        activeOpacity={0.8}
      >
        <View style={[styles.iconRing, { backgroundColor: colors.warningBg }, selected === 'other' && styles.iconRingSelected]}>
          <Ionicons name="people-outline" size={28} color={selected === 'other' ? colors.onPrimary : colors.purple} />
        </View>
        <ThemedText style={[styles.title, { color: colors.text }, selected === 'other' && { color: colors.onPrimary }]}>
          Pour un proche
        </ThemedText>
        <ThemedText style={[styles.desc, { color: colors.textSecondary }, selected === 'other' && { color: colors.glassTintStrong }]}>
          Je déclare la perte d&apos;un document pour un tiers
        </ThemedText>
        {selected === 'other' && (
          <View style={[styles.checkBadge, { backgroundColor: colors.purple }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconRingSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  desc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});
