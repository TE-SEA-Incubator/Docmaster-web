import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/common/Input';
import { ThemedText } from '@/components/themed-text';
import { DatePickerInput } from './DatePickerInput';
import type { DocFieldDef } from './DOC_TYPE_META';
import { useThemeColors } from '@/hooks/useThemeColors';

type DocDynamicFieldsProps = {
  fields?: DocFieldDef[];
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

export const DocDynamicFields: React.FC<DocDynamicFieldsProps> = ({ fields, values, onChange }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  if (!fields || fields.length === 0) {
    return (
      <View style={[styles.emptyBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('declarer:loadingFields')}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {fields.map((field) => {
        const isOptional = !!field.optional;
        const fieldLabel = t(`declarer:${field.label}`);
        const fieldPlaceholder = field.placeholder ? t(`declarer:${field.placeholder}`) : '';
        const labelText = isOptional ? `${fieldLabel} (${t('common:optional')})` : `${fieldLabel} *`;
        const isDate = field.type === 'date';

        return (
          <View key={field.key} style={styles.fieldContainer}>
            <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>{labelText}</ThemedText>
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
                placeholder={fieldPlaceholder}
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
    marginLeft: 4,
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
