import { useEffect, useState, useCallback, useRef } from 'react';
import { useColorScheme, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/core/api/queryClient';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useLanguageStore } from '@/core/store/useLanguageStore';
import { useThemeStore } from '@/core/store/useThemeStore';
import { getAccessToken } from '@/core/utils/secureStorage';
import type * as Notifications from 'expo-notifications';
import { registerForPushNotifications, addNotificationResponseReceivedListener } from '@/core/api/pushNotificationsService';
import { Colors } from '@/constants/theme';
import { AppSplash } from '@/components/AppSplash';

SplashScreen.preventAutoHideAsync();

async function initAuth() {
  const token = await getAccessToken();
  if (!token) {
    useAuthStore.getState().setLoading(false);
    return;
  }
  const restored = await useAuthStore.getState().restoreSession();
  if (!restored) useAuthStore.getState().setLoading(false);
  try {
    await useAuthStore.getState().fetchProfile();
  } catch {
    await useAuthStore.getState().logout();
  }
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const hasCompletedOnboarding = useAuthStore(state => state.hasCompletedOnboarding);
  const hasSelectedLanguage = useLanguageStore(state => state.hasSelectedLanguage);
  const restoreLanguage = useLanguageStore(state => state.restoreLanguage);
  const segments = useSegments();
  const router = useRouter();
  const themeMode = useThemeStore(state => state.mode);
  const systemScheme = useColorScheme();
  const resolved: 'light' | 'dark' = themeMode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : themeMode;
  const statusBarStyle = resolved === 'dark' ? 'light' : 'dark';
  const statusBarBg = Colors[resolved].background;

  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    async function prepare() {
      await restoreLanguage();
      await initAuth();

      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        registerForPushNotifications();
      }

      setAppReady(true);
    }
    prepare();

    notificationResponseListener.current = addNotificationResponseReceivedListener((response) => {
      router.push('/notifications');
    });

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (appReady && !isLoading) {
      SplashScreen.hide();
    }
  }, [appReady, isLoading]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    if (showSplash || !appReady || isLoading) return;

    const inLangSelect = segments[0] === 'language-select';
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!hasSelectedLanguage) {
      if (!inLangSelect) {
        router.replace('/language-select');
      }
    } else if (!hasCompletedOnboarding) {
      if (!inOnboarding) {
        router.replace('/onboarding');
      }
    } else if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else if (isAuthenticated && (inAuthGroup || inOnboarding || inLangSelect)) {
      router.replace('/(tabs)');
      registerForPushNotifications();
    }
  }, [isAuthenticated, isLoading, hasCompletedOnboarding, hasSelectedLanguage, segments, appReady, showSplash]);

  if (showSplash) {
    return (
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1, backgroundColor: statusBarBg }}>
          <StatusBar style={statusBarStyle} translucent backgroundColor="transparent" />
          <AppSplash onFinish={handleSplashFinish} />
        </View>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: statusBarBg }}>
        <BottomSheetModalProvider>
          <View style={{ flex: 1, backgroundColor: statusBarBg }}>
            <StatusBar style={statusBarStyle} translucent backgroundColor="transparent" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="language-select" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
              <Stack.Screen name="declaration/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen name="document/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen name="device/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen name="device/add" options={{ presentation: 'card' }} />

              <Stack.Screen name="manage-profile" options={{ presentation: 'card' }} />
            </Stack>
          </View>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
