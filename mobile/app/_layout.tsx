import "../global.css";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { OfflineBanner } from "@/components/OfflineBanner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { flushQueue } from "@/lib/offlineQueue";
import { initOnlineManager } from "@/lib/onlineManager";
import { persistOptions, queryClient } from "@/lib/queryClient";

export const unstable_settings = {
  initialRouteName: "index",
};

/**
 * Redirects between the (auth) and (tabs) groups based on session state.
 * This is the single source of truth that "protects" the app routes.
 */
function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait until the token check completes.

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, router]);
}

function RootNavigator() {
  useProtectedRoute();

  return (
    <View className="flex-1 bg-bgMain">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modals/create-document"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <OfflineBanner />
    </View>
  );
}

export default function RootLayout() {
  // Bridge NetInfo -> React Query and flush the offline queue on launch.
  useEffect(() => {
    const dispose = initOnlineManager();
    void flushQueue();
    return dispose;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
          onSuccess={() => {
            // Once the cache is restored, replay any mutations React Query paused.
            void queryClient.resumePausedMutations();
            void flushQueue();
          }}
        >
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
