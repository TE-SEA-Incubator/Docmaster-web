import React, { useState, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BottomTabInset } from '@/constants/theme';
import { PlusSheet } from '@/components/plus-sheet';

const TABS = [
  { name: 'index', label: 'Accueil', icon: 'home', iconOutline: 'home-outline' },
  { name: 'documents', label: 'Documents', icon: 'document-text', iconOutline: 'document-text-outline' },
  { name: 'devices', label: 'Mes appareils', icon: 'phone-portrait', iconOutline: 'phone-portrait-outline' },
  { name: 'rechercher', label: 'Docmaster', icon: 'search', iconOutline: 'search-outline' },
] as const;

const HIDDEN_ROUTES = ['declarer', 'trouver', 'recuperer', 'rendre'];

type TabButtonProps = {
  tab: typeof TABS[number];
  isFocused: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
};

const TabButton = React.memo(function TabButton({ tab, isFocused, onPress, colors }: TabButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.tab}>
      <View style={[styles.indicator, isFocused && { backgroundColor: colors.tabActive }]} />
      <Ionicons
        name={isFocused ? tab.icon : tab.iconOutline}
        size={24}
        color={isFocused ? colors.tabActive : colors.textSecondary}
      />
      <Text style={{
        fontSize: 10,
        color: isFocused ? colors.tabActive : colors.textSecondary,
        fontWeight: isFocused ? '600' : '400',
      }}>
        {tab.label}
      </Text>
    </Pressable>
  );
});

function TabBar({ state, navigation }: any) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);

  const openSheet = useCallback(() => setSheetVisible(true), []);
  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const createTabPressHandler = useCallback((routeIndex: number) => {
    return () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes[routeIndex].key,
        canPreventDefault: true,
      });
      if (state.index !== routeIndex && !event.defaultPrevented) {
        navigation.navigate(state.routes[routeIndex].name);
      }
    };
  }, [navigation, state]);

  const currentRouteName = state.routes[state.index].name;
  const isHidden = HIDDEN_ROUTES.includes(currentRouteName);

  // Adapts the tab bar's bottom padding to whatever the device's system
  // navigation chrome reports via useSafeAreaInsets():
  //   - Gesture nav (Android 10+ / iOS home indicator): insets.bottom ≈ 24dp
  //   - 2-button nav (older Android): insets.bottom ≈ 40dp
  //   - 3-button nav (legacy Android): insets.bottom ≈ 48dp
  //   - No nav bar (some tablets): insets.bottom = 0, falls back to BottomTabInset
  // We take the max with BottomTabInset so the bar always keeps its minimum
  // breathing room even when the system reports zero inset. This single
  // value drives every screen's bottom clearance too (see `useBottomTabClearance`).
  const tabBarPaddingBottom = Math.max(insets.bottom, BottomTabInset);

  if (isHidden) return null;

  const regularTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  return (
    <>
      {sheetVisible && <PlusSheet visible onClose={closeSheet} />}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: tabBarPaddingBottom,
          },
        ]}
      >
        {regularTabs.map((tab) => {
          const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
          const isFocused = state.index === routeIndex;
          return (
            <TabButton
              key={tab.name}
              tab={tab}
              isFocused={isFocused}
              onPress={createTabPressHandler(routeIndex)}
              colors={colors}
            />
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
          return (
            <TabButton
              key={tab.name}
              tab={tab}
              isFocused={isFocused}
              onPress={createTabPressHandler(routeIndex)}
              colors={colors}
            />
          );
        })}
      </View>
    </>
  );
}

const MemoizedTabBar = React.memo(TabBar);

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <MemoizedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="documents" />
      <Tabs.Screen name="devices" />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="card" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
      <Tabs.Screen name="declarations" options={{ href: null }} />
      <Tabs.Screen name="declarer" options={{ href: null }} />
      <Tabs.Screen name="trouver" options={{ href: null }} />
      <Tabs.Screen name="recuperer" options={{ href: null }} />
      <Tabs.Screen name="rendre" options={{ href: null }} />
      <Tabs.Screen name="rechercher" />
      <Tabs.Screen name="parrainage" options={{ href: null }} />
      <Tabs.Screen name="gains" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 4,
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
