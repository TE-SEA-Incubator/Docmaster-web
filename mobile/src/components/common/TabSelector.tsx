import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';
import { useThemeColors } from '@/hooks/useThemeColors';

export type TabItem = {
  value: string;
  label: string;
};

export type TabSelectorProps = {
  tabs: TabItem[];
  selectedValue: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
};

const getTabStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSelected,
    padding: 6,
    borderRadius: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabSelected: {
    backgroundColor: colors.backgroundElement,
  },
  tabDefault: {
    backgroundColor: 'transparent',
  },
  tabTextSelected: {
    color: colors.tabActive,
  },
  tabTextDefault: {
    color: colors.tabInactive,
  },
});

type TabItemInnerProps = {
  tab: TabItem;
  isSelected: boolean;
  onChange: (value: string) => void;
  colors: ReturnType<typeof useThemeColors>;
};

const TabItemInner = React.memo(function TabItemInner({ tab, isSelected, onChange, colors }: TabItemInnerProps) {
  const onPress = useCallback(() => onChange(tab.value), [onChange, tab.value]);
  const styles = getTabStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tab,
        isSelected ? styles.tabSelected : styles.tabDefault,
      ]}
    >
      <ThemedText
        style={[
          { fontSize: 14, fontWeight: '700' },
          isSelected ? styles.tabTextSelected : styles.tabTextDefault,
        ]}
      >
        {tab.label}
      </ThemedText>
    </Pressable>
  );
});

function TabSelectorInner({ tabs, selectedValue, onChange, style }: TabSelectorProps) {
  const colors = useThemeColors();
  const styles = getTabStyles(colors);
  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => (
        <TabItemInner
          key={tab.value}
          tab={tab}
          isSelected={tab.value === selectedValue}
          onChange={onChange}
          colors={colors}
        />
      ))}
    </View>
  );
}

export const TabSelector = React.memo(TabSelectorInner);
