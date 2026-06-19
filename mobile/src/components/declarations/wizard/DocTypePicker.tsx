import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';
import { BORDER, TEXT_MAIN } from './DOC_TYPE_META';
import { DocTypeCatalog } from '@/types';

type DocTypePickerProps = {
  types: DocTypeCatalog[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
};

export const DocTypePicker: React.FC<DocTypePickerProps> = ({ types, selectedCode, onSelect }) => {
  const handleSelect = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(code);
  };

  return (
    <View>
      <ThemedText style={styles.sectionTitle}>Quel document avez-vous perdu ?</ThemedText>
      <View style={styles.grid}>
        {types.map((item) => {
          const isSelected = selectedCode === item.code;
          const color = item.color || '#F5A64B';
          const bg = item.bg || '#FEF3C7';
          const icon = item.icone || 'document-text-outline';

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                isSelected && { backgroundColor: color, borderColor: color },
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleSelect(item.code)}
            >
              {/* Icon bg pill */}
              <View style={[styles.iconWrap, { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : bg }]}>
                <Ionicons
                  name={icon as any}
                  size={22}
                  color={isSelected ? '#fff' : color}
                />
              </View>
              <ThemedText
                style={[styles.label, isSelected && styles.labelSelected]}
                numberOfLines={2}
              >
                {item.nom}
              </ThemedText>
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'flex-start',
    minHeight: 100,
    position: 'relative',
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MAIN,
    letterSpacing: -0.1,
  },
  labelSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});