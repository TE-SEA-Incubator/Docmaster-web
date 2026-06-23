import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '@/hooks/useThemeColors';

const PLACES = [
  { key: 'market', icon: 'storefront-outline' },
  { key: 'transport', icon: 'bus-outline' },
  { key: 'restaurant', icon: 'restaurant-outline' },
  { key: 'administration', icon: 'business-outline' },
  { key: 'hospital', icon: 'medical-outline' },
  { key: 'airport', icon: 'airplane-outline' },
  { key: 'school', icon: 'school-outline' },
  { key: 'street', icon: 'map-outline' },
];

type PlaceChipInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export const PlaceChipInput: React.FC<PlaceChipInputProps> = ({ label, placeholder, value, onChange, icon }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const handleChip = (label: string) => {
    Haptics.selectionAsync();
    onChange(label);
  };

  return (
    <View style={styles.container}>
      <Input
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        icon={icon || 'location-outline'}
      />
      <ThemedText style={[styles.chipLabel, { color: colors.textSecondary }]}>{t('common:quickSuggestions')}</ThemedText>
      <View style={styles.chipsContainer}>
        {PLACES.map((place) => {
          const isSelected = value === t(`declarer:place_${place.key}`);
          return (
            <TouchableOpacity
              key={place.key}
              style={[
                styles.chip,
                { backgroundColor: colors.surface2, borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => handleChip(t(`declarer:place_${place.key}`))}
              activeOpacity={0.75}
            >
              <Ionicons
                name={place.icon as any}
                size={13}
                color={isSelected ? colors.onPrimary : colors.textSecondary}
              />
              <ThemedText
                style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  isSelected && { color: colors.onPrimary },
                ]}
              >
                {t(`declarer:place_${place.key}`)}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 10 },
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
