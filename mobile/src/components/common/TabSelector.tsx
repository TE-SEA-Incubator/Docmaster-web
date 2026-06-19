import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';

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

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EAE3D8',
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
    backgroundColor: '#FFFFFF',
  },
  tabDefault: {
    backgroundColor: 'transparent',
  },
  tabTextSelected: {
    color: '#F5A64B',
  },
  tabTextDefault: {
    color: '#6B7280',
  },
});

type TabItemInnerProps = {
  tab: TabItem;
  isSelected: boolean;
  onChange: (value: string) => void;
};

const TabItemInner = React.memo(function TabItemInner({ tab, isSelected, onChange }: TabItemInnerProps) {
  const onPress = useCallback(() => onChange(tab.value), [onChange, tab.value]);
  return (
    <Pressable
      onPress={onPress}
      style={[
        tabStyles.tab,
        isSelected ? tabStyles.tabSelected : tabStyles.tabDefault,
      ]}
    >
      <ThemedText
        style={[
          { fontSize: 14, fontWeight: '700' },
          isSelected ? tabStyles.tabTextSelected : tabStyles.tabTextDefault,
        ]}
      >
        {tab.label}
      </ThemedText>
    </Pressable>
  );
});

function TabSelectorInner({ tabs, selectedValue, onChange, style }: TabSelectorProps) {
  return (
    <View style={[tabStyles.container, style]}>
      {tabs.map((tab) => (
        <TabItemInner
          key={tab.value}
          tab={tab}
          isSelected={tab.value === selectedValue}
          onChange={onChange}
        />
      ))}
    </View>
  );
}

export const TabSelector = React.memo(TabSelectorInner);
