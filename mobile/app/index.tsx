import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/core/store/useAuthStore';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();

  useEffect(() => {
    console.log('[IndexScreen] Checking session...');
    restoreSession();
  }, [restoreSession]);

  if (isLoading) {
    console.log('[IndexScreen] Still loading...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4EFE6' }}>
        <ActivityIndicator size="large" color="#F5A64B" />
      </View>
    );
  }

  console.log(`[IndexScreen] Redirecting. Authenticated: ${isAuthenticated}`);
  
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)" />;
}
