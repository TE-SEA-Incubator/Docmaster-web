import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';
import { PRIMARY, BORDER, TEXT_MUTED } from './DOC_TYPE_META';

const PLACES = [
  { label: 'Marché', icon: 'storefront-outline' },
  { label: 'Taxi', icon: 'car-outline' },
  { label: 'Transport', icon: 'bus-outline' },
  { label: 'Restaurant', icon: 'restaurant-outline' },
  { label: 'École', icon: 'school-outline' },
  { label: 'Aéroport', icon: 'airplane-outline' },
  { label: 'Gare', icon: 'train-outline' },
  { label: 'Hôpital', icon: 'medical-outline' },
  { label: 'Banque', icon: 'business-outline' },
];

type PlaceChipInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export const PlaceChipInput: React.FC<PlaceChipInputProps> = ({ value, onChange }) => {
  const handleChip = (label: string) => {
    Haptics.selectionAsync();
    onChange(label);
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.sectionTitle}>Où avez-vous perdu le document ?</ThemedText>
      <Input
        value={value}
        onChangeText={onChange}
        placeholder="Ville ou lieu..."
        containerStyle={styles.input}
        icon="location-outline"
      />
      <ThemedText style={styles.chipLabel}>Lieux fréquents</ThemedText>
      <View style={styles.chipsContainer}>
        {PLACES.map((place) => {
          const isSelected = value === place.label;
          return (
            <TouchableOpacity
              key={place.label}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handleChip(place.label)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={place.icon as any}
                size={13}
                color={isSelected ? '#fff' : TEXT_MUTED}
              />
              <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {place.label}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
  },
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