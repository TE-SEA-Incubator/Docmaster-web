import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '@/components/common/Input';
import { DocFieldDef } from './DOC_TYPE_META';

type DocDynamicFieldsProps = {
  fields: DocFieldDef[];
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

export const DocDynamicFields: React.FC<DocDynamicFieldsProps> = ({ fields, values, onChange }) => {
  if (!fields || fields.length === 0) return null;

  return (
    <View style={styles.container}>
      {fields.map((field) => (
        <Input
            key={field.key}
            label={field.label}
            value={values[field.key] || ''}
            onChangeText={(val) => onChange(field.key, val)}
            placeholder={field.placeholder || `Entrez ${field.label.toLowerCase()}`}
            containerStyle={styles.fieldContainer}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
  },
});
