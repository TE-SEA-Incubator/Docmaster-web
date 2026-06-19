import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PRIMARY, BORDER, TEXT_MAIN } from './DOC_TYPE_META';

type DeclarationTypePickerProps = {
  selected: 'self' | 'other' | null;
  onSelect: (type: 'self' | 'other') => void;
};

export const DeclarationTypePicker: React.FC<DeclarationTypePickerProps> = ({ selected, onSelect }) => {
  const handleSelect = (type: 'self' | 'other') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(type);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.card, selected === 'self' && styles.cardSelected]}
        onPress={() => handleSelect('self')}
        activeOpacity={0.8}
      >
        <View style={[styles.iconRing, selected === 'self' && styles.iconRingSelected]}>
          <Ionicons name="person-outline" size={28} color={selected === 'self' ? '#fff' : PRIMARY} />
        </View>
        <ThemedText style={[styles.title, selected === 'self' && styles.titleSelected]}>
          Pour moi-même
        </ThemedText>
        <ThemedText style={[styles.desc, selected === 'self' && styles.descSelected]}>
          Je déclare la perte de mon propre document
        </ThemedText>
        {selected === 'self' && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, selected === 'other' && styles.cardSelectedOther]}
        onPress={() => handleSelect('other')}
        activeOpacity={0.8}
      >
        <View style={[styles.iconRing, selected === 'other' && styles.iconRingSelectedOther]}>
          <Ionicons name="people-outline" size={28} color={selected === 'other' ? '#fff' : '#8B5CF6'} />
        </View>
        <ThemedText style={[styles.title, selected === 'other' && styles.titleSelected]}>
          Pour un proche
        </ThemedText>
        <ThemedText style={[styles.desc, selected === 'other' && styles.descSelected]}>
          Je déclare la perte d&apos;un document pour un tiers
        </ThemedText>
        {selected === 'other' && (
          <View style={[styles.checkBadge, { backgroundColor: '#8B5CF6' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
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
    borderColor: BORDER,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  cardSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  cardSelectedOther: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF0DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconRingSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  iconRingSelectedOther: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  titleSelected: {
    color: '#fff',
  },
  desc: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 15,
  },
  descSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});
