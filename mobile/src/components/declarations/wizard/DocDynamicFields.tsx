import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '@/components/common/Input';
import { ThemedText } from '@/components/themed-text';
import { BORDER, TEXT_MUTED, PRIMARY } from './DOC_TYPE_META';
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
        const isRequired = field.required;
        return (
          <Input
            key={field.key}
            label={isRequired ? `${field.label} *` : field.label}
            value={values[field.key] || ''}
            onChangeText={(val) => onChange(field.key, val)}
            placeholder={field.placeholder || ''}
            containerStyle={styles.fieldContainer}
            multiline={field.multiline}
            keyboardType={field.keyboardType}
            icon={(field.icon || 'create-outline') as any}
          />
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
