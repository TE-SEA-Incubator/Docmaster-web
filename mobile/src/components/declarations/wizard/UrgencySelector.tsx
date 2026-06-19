import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';
import { BORDER, TEXT_MUTED } from './DOC_TYPE_META';

type Urgency = 'Basse' | 'Modérée' | 'Haute';

const URGENCY_LEVELS: {
  label: Urgency;
  color: string;
  bg: string;
  icon: string;
  description: string;
}[] = [
  {
    label: 'Basse',
    color: '#16A34A',
    bg: '#ECFDF5',
    icon: 'time-outline',
    description: 'Pas pressé',
  },
  {
    label: 'Modérée',
    color: '#D97706',
    bg: '#FFFBEB',
    icon: 'alert-circle-outline',
    description: 'Sous quelques jours',
  },
  {
    label: 'Haute',
    color: '#DC2626',
    bg: '#FEF2F2',
    icon: 'flash-outline',
    description: 'Très urgent',
  },
];

type UrgencySelectorProps = {
  selected: Urgency | null;
  onSelect: (urgency: Urgency) => void;
};

export const UrgencySelector: React.FC<UrgencySelectorProps> = ({ selected, onSelect }) => {
  const handleSelect = (label: Urgency) => {
    if (label === 'Haute') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(label);
  };

  return (
    <View>
      <ThemedText style={styles.sectionTitle}>Niveau d'urgence</ThemedText>
      <View style={styles.container}>
        {URGENCY_LEVELS.map((level) => {
          const isSelected = selected === level.label;
          return (
            <TouchableOpacity
              key={level.label}
              style={[
                styles.button,
                isSelected && {
                  backgroundColor: level.bg,
                  borderColor: level.color,
                  borderWidth: 2,
                },
              ]}
              onPress={() => handleSelect(level.label)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={level.icon as any}
                size={18}
                color={isSelected ? level.color : TEXT_MUTED}
              />
              <ThemedText
                style={[
                  styles.label,
                  isSelected && { color: level.color, fontWeight: '700' },
                ]}
              >
                {level.label}
              </ThemedText>
              <ThemedText
                style={[
                  styles.desc,
                  isSelected && { color: level.color, opacity: 0.8 },
                ]}
              >
                {level.description}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  container: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 2,
  },
  desc: {
    fontSize: 9.5,
    color: TEXT_MUTED,
    textAlign: 'center',
    fontWeight: '500',
  },
});