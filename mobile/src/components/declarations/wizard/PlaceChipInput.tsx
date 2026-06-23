import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { PRIMARY, BORDER, TEXT_MUTED } from './DOC_TYPE_META';

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
      <ThemedText style={styles.chipLabel}>{t('common:quickSuggestions')}</ThemedText>
      <View style={styles.chipsContainer}>
        {PLACES.map((place) => {
          const isSelected = value === t(`declarer:place_${place.key}`);
          return (
            <TouchableOpacity
              key={place.key}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handleChip(t(`declarer:place_${place.key}`))}
              activeOpacity={0.75}
            >
              <Ionicons
                name={place.icon as any}
                size={13}
                color={isSelected ? '#fff' : TEXT_MUTED}
              />
              <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
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
    color: TEXT_MUTED,
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
    backgroundColor: '#F3EFE8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextSelected: {
    color: '#fff',
  },
});