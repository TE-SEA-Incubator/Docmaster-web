import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, BORDER, TEXT_MAIN } from './DOC_TYPE_META';

type DatePickerInputProps = {
  value: Date;
  onChange: (date: Date) => void;
  label: string;
};

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function formatDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({ value, onChange, label }) => {
  const [show, setShow] = useState(false);
  const today = new Date();
  const maxDate = today;

  const handleValueChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) onChange(selectedDate);
  };

  const handleDismiss = () => setShow(false);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
        <ThemedText style={styles.dateText}>{formatDate(value)}</ThemedText>
        <View style={styles.spacer} />
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          maximumDate={maxDate}
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT_MAIN },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MAIN,
  },
  spacer: {
    flex: 1,
  },
});
