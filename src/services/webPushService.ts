import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./firebase";
import apiClient from "./api";

let messaging: ReturnType<typeof getMessaging> | null = null;
let currentToken: string | null = null;

function getMessagingInstance() {
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

export async function registerPushToken(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("WebPush: VITE_FIREBASE_VAPID_KEY not configured");
      return null;
    }

    const token = await getToken(getMessagingInstance(), { vapidKey });
    if (!token) return null;

    currentToken = token;

    await apiClient.post("notifications/register-push-token", {
      token,
      platform: "web",
      device_name: navigator.userAgent,
    });

    return token;
  } catch (err) {
    console.warn("WebPush registration failed:", err);
    return null;
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!currentToken) return;
  try {
    await apiClient.post("notifications/register-push-token", {
      token: currentToken,
      platform: "web",
      device_name: navigator.userAgent,
      unregister: true,
    });
  } catch {
    // ignore
  }
  currentToken = null;
}

export function onForegroundMessage(callback: (payload: any) => void) {
  try {
    return onMessage(getMessagingInstance(), callback);
  } catch {
    return () => {};
  }
}
