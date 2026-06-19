import React, { useState, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { PlusSheet } from '@/components/plus-sheet';

const TABS = [
  { name: 'index', label: 'Accueil', icon: 'home', iconOutline: 'home-outline' },
  { name: 'documents', label: 'Documents', icon: 'document-text', iconOutline: 'document-text-outline' },
  { name: 'devices', label: 'Mes appareils', icon: 'phone-portrait', iconOutline: 'phone-portrait-outline' },
  { name: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

function TabBar({ state, navigation }: any) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const [sheetVisible, setSheetVisible] = useState(false);

  const openSheet = useCallback(() => setSheetVisible(true), []);
  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const regularTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  return (
    <>
      <PlusSheet visible={sheetVisible} onClose={closeSheet} />
      <View style={[styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {regularTabs.map((tab) => {
          const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[routeIndex].key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(tab.name);
            }
          };

          return (
            <Pressable key={tab.name} onPress={onPress} style={styles.tab}>
              <View style={[styles.indicator, isFocused && { backgroundColor: colors.tabActive }]} />
              <Ionicons
                name={isFocused ? (tab.icon as any) : (tab.iconOutline as any)}
                size={24}
                color={isFocused ? colors.tabActive : colors.textSecondary}
              />
              <Text style={{ fontSize: 10, color: isFocused ? colors.tabActive : colors.textSecondary, fontWeight: isFocused ? '600' : '400' }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable onPress={openSheet} style={styles.centerTab}>
          <View style={[styles.centerButton, { backgroundColor: colors.tabActive, shadowColor: colors.tabActive }]}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </View>
        </Pressable>

        {rightTabs.map((tab) => {
          const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[routeIndex].key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(tab.name);
            }
          };

          return (
            <Pressable key={tab.name} onPress={onPress} style={styles.tab}>
              <View style={[styles.indicator, isFocused && { backgroundColor: colors.tabActive }]} />
              <Ionicons
                name={isFocused ? (tab.icon as any) : (tab.iconOutline as any)}
                size={24}
                color={isFocused ? colors.tabActive : colors.textSecondary}
              />
              <Text style={{ fontSize: 10, color: isFocused ? colors.tabActive : colors.textSecondary, fontWeight: isFocused ? '600' : '400' }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="documents" />
      <Tabs.Screen name="devices" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="card" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 88,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  centerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
});
