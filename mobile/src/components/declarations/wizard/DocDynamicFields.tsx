import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '@/components/common/Input';
import { ThemedText } from '@/components/themed-text';
import { DatePickerInput } from './DatePickerInput';
import { BORDER, TEXT_MUTED } from './DOC_TYPE_META';
import type { DocFieldDef } from './DOC_TYPE_META';

type DocDynamicFieldsProps = {
  fields?: DocFieldDef[];
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

export const DocDynamicFields: React.FC<DocDynamicFieldsProps> = ({ fields, values, onChange }) => {
  if (!fields || fields.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <ThemedText style={styles.emptyText}>
          Aucun champ supplémentaire requis pour ce type de document.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {fields.map((field) => {
        const isOptional = !!field.optional;
        const labelText = isOptional ? `${field.label} (Optionnel)` : `${field.label} *`;
        const isDate = field.type === 'date';

        return (
          <View key={field.key} style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>{labelText}</ThemedText>
            {isDate ? (
              <DatePickerInput
                label=""
                value={values[field.key] ? new Date(values[field.key]) : new Date()}
                onChange={(d) => onChange(field.key, d.toISOString().split('T')[0])}
              />
            ) : (
              <Input
                value={values[field.key] || ''}
                onChangeText={(val) => onChange(field.key, val)}
                placeholder={field.placeholder || ''}
                multiline={field.multiline || field.type === 'textarea'}
                keyboardType={field.keyboardType}
                icon={(field.icon || 'create-outline') as any}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 4,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },
});