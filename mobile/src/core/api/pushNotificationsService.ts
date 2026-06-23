import { Platform } from 'react-native';
import apiClient from './apiClient';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  console.warn('[PushNotifications] expo-notifications unavailable (needs native rebuild)');
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) return null;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[PushNotifications] Permission not granted');
      return null;
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    const pushToken = tokenData.data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    try {
      await apiClient.post('notifications/register-push-token', {
        token: pushToken,
        platform: Platform.OS,
      });
    } catch {
      console.warn('[PushNotifications] Failed to register token with server');
    }

    return pushToken;
  } catch (error) {
    console.error('[PushNotifications] Registration failed:', error);
    return null;
  }
}

export function addNotificationReceivedListener(
  handler: (notification: any) => void
): { remove: () => void } {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseReceivedListener(
  handler: (response: any) => void
): { remove: () => void } {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(handler);
}
