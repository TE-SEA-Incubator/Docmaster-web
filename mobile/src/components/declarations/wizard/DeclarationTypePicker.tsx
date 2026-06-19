import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, BORDER } from './DOC_TYPE_META';

type DeclarationTypePickerProps = {
  selected: 'self' | 'other' | null;
  onSelect: (type: 'self' | 'other') => void;
};

export const DeclarationTypePicker: React.FC<DeclarationTypePickerProps> = ({ selected, onSelect }) => (
  <View style={styles.container}>
    <TouchableOpacity
      style={[styles.option, selected === 'self' && styles.selected]}
      onPress={() => onSelect('self')}
    >
      <Ionicons name="person-outline" size={24} color={selected === 'self' ? '#fff' : PRIMARY} />
      <ThemedText style={[styles.text, selected === 'self' && styles.selectedText]}>Pour moi-même</ThemedText>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.option, selected === 'other' && styles.selected]}
      onPress={() => onSelect('other')}
    >
      <Ionicons name="people-outline" size={24} color={selected === 'other' ? '#fff' : PRIMARY} />
      <ThemedText style={[styles.text, selected === 'other' && styles.selectedText]}>Pour un proche</ThemedText>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 16 },
  option: { flex: 1, alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: BORDER, gap: 8 },
  selected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  text: { fontSize: 14, fontWeight: 'bold' },
  selectedText: { color: '#fff' },
});
