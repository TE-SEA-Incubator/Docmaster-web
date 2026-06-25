import { Platform } from 'react-native';
import * as Device from 'expo-device';
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

  // Push tokens only work on physical devices
  if (!Device.isDevice) {
    console.warn('[PushNotifications] Must use physical device for push notifications');
    return null;
  }

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

    // Android requires a notification channel before receiving any push
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F5A64B',
        showBadge: true,
      });
    }

    // getDevicePushTokenAsync returns the raw FCM (Android) / APNs (iOS) token
    // This is what Firebase Admin SDK expects for sendEachForMulticast
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const pushToken: string = tokenData.data;

    if (!pushToken) {
      console.warn('[PushNotifications] Empty token received');
      return null;
    }

    try {
      await apiClient.post('notifications/register-push-token', {
        token: pushToken,
        platform: Platform.OS,
        device_name: Device.deviceName || Device.modelName || Platform.OS,
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

export async function unregisterPushNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    if (tokenData?.data) {
      await apiClient.post('notifications/unregister-push-token', {
        token: tokenData.data,
        platform: Platform.OS,
      });
    }
  } catch {
    // Ignore — best effort
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
