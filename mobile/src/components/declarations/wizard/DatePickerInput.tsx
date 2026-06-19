import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, BORDER } from './DOC_TYPE_META';

type DatePickerInputProps = {
  value: Date;
  onChange: (date: Date) => void;
  label: string;
};

export const DatePickerInput: React.FC<DatePickerInputProps> = ({ value, onChange, label }) => {
  const [show, setShow] = useState(false);

  const handleValueChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) onChange(selectedDate);
  };

  const handleDismiss = () => setShow(false);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)}>
        <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
        <ThemedText>{value.toLocaleDateString()}</ThemedText>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    gap: 8,
  },
});
