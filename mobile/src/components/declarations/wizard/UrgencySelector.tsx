import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';

type Urgency = 'Basse' | 'Modérée' | 'Haute';

type UrgencyLevel = {
  label: Urgency;
  colorKey: 'success' | 'warning' | 'danger';
  bgKey: 'successBg' | 'warningBg' | 'dangerBg';
  icon: string;
  description: string;
};

const URGENCY_LEVELS: UrgencyLevel[] = [
  {
    label: 'Basse',
    colorKey: 'success',
    bgKey: 'successBg',
    icon: 'time-outline',
    description: 'Pas pressé',
  },
  {
    label: 'Modérée',
    colorKey: 'warning',
    bgKey: 'warningBg',
    icon: 'alert-circle-outline',
    description: 'Sous quelques jours',
  },
  {
    label: 'Haute',
    colorKey: 'danger',
    bgKey: 'dangerBg',
    icon: 'flash-outline',
    description: 'Très urgent',
  },
];

type UrgencySelectorProps = {
  selected: Urgency | null;
  onSelect: (urgency: Urgency) => void;
};

export const UrgencySelector: React.FC<UrgencySelectorProps> = ({ selected, onSelect }) => {
  const colors = useThemeColors();

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
      <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Niveau d'urgence</ThemedText>
      <View style={styles.container}>
        {URGENCY_LEVELS.map((level) => {
          const isSelected = selected === level.label;
          const levelColor = colors[level.colorKey];
          const levelBg = colors[level.bgKey];
          return (
            <TouchableOpacity
              key={level.label}
              style={[
                styles.button,
                { borderColor: colors.border, backgroundColor: colors.backgroundElement },
                isSelected && {
                  backgroundColor: levelBg,
                  borderColor: levelColor,
                  borderWidth: 2,
                },
              ]}
              onPress={() => handleSelect(level.label)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={level.icon as any}
                size={18}
                color={isSelected ? levelColor : colors.textSecondary}
              />
              <ThemedText
                style={[
                  styles.label,
                  { color: colors.textSecondary },
                  isSelected && { color: levelColor, fontWeight: '700' },
                ]}
              >
                {level.label}
              </ThemedText>
              <ThemedText
                style={[
                  styles.desc,
                  { color: colors.textSecondary },
                  isSelected && { color: levelColor, opacity: 0.8 },
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
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  container: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  desc: {
    fontSize: 9.5,
    textAlign: 'center',
    fontWeight: '500',
  },
});
