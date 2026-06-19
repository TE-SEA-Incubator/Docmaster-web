import { useEffect, useState, useCallback } from 'react';
import { useColorScheme, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/core/api/queryClient';
import { useAuthStore } from '@/core/store/useAuthStore';
import { getAccessToken } from '@/core/utils/secureStorage';
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
  const segments = useSegments();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const statusBarStyle = isDark ? 'light' : 'dark';
  const statusBarBg = isDark ? Colors.dark.background : Colors.light.background;

  useEffect(() => {
    async function prepare() {
      await initAuth();
      setAppReady(true);
    }
    prepare();
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

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!hasCompletedOnboarding) {
      if (!inOnboarding) {
        router.replace('/onboarding');
      }
    } else if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else if (isAuthenticated && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, hasCompletedOnboarding, segments, appReady, showSplash]);

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
      <View style={{ flex: 1, backgroundColor: statusBarBg }}>
        <StatusBar style={statusBarStyle} translucent backgroundColor="transparent" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          <Stack.Screen name="declaration/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="document/[id]" options={{ presentation: 'card' }} />

          <Stack.Screen name="manage-profile" options={{ presentation: 'card' }} />
        </Stack>
      </View>
    </QueryClientProvider>
  );
}
