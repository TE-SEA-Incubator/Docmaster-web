import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';

type DatePickerInputProps = {
  value: Date;
  onChange: (date: Date) => void;
  label: string;
  /**
   * 'date' (défaut) : sélecteur de date avec maximumDate = aujourd'hui.
   * 'time' : sélecteur d'heure (utilisé pour "Heure de la perte").
   */
  mode?: 'date' | 'time';
};

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function formatDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({ value, onChange, label, mode = 'date' }) => {
  const [show, setShow] = useState(false);
  const colors = useThemeColors();
  const today = new Date();
  const maxDate = mode === 'date' ? today : undefined;

  const handleValueChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) onChange(selectedDate);
  };

  const handleDismiss = () => setShow(false);

  const display = mode === 'time' ? formatTime(value) : formatDate(value);
  const icon = mode === 'time' ? 'time-outline' : 'calendar-outline';

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
      <TouchableOpacity
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
        <ThemedText style={[styles.dateText, { color: colors.text }]}>{display}</ThemedText>
        <View style={styles.spacer} />
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          maximumDate={maxDate as any}
          onValueChange={handleValueChange}
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
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    gap: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
});
