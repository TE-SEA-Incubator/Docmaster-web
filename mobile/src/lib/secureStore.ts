import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Thin, typed wrapper around expo-secure-store.
 *
 * expo-secure-store is not available on web, so we transparently fall
 * back to localStorage there. On iOS/Android the values are encrypted
 * at rest (Keychain / Keystore).
 */

export const SECURE_KEYS = {
  accessToken: "docmaster.accessToken",
  refreshToken: "docmaster.refreshToken",
  userSession: "docmaster.userSession",
} as const;

export type SecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];

const isWeb = Platform.OS === "web";

export async function setItem(key: SecureKey, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: SecureKey): Promise<string | null> {
  if (isWeb) {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteItem(key: SecureKey): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  getAccessToken: () => getItem(SECURE_KEYS.accessToken),
  getRefreshToken: () => getItem(SECURE_KEYS.refreshToken),
  async setTokens(accessToken: string, refreshToken?: string) {
    await setItem(SECURE_KEYS.accessToken, accessToken);
    if (refreshToken) await setItem(SECURE_KEYS.refreshToken, refreshToken);
  },
  async clear() {
    await deleteItem(SECURE_KEYS.accessToken);
    await deleteItem(SECURE_KEYS.refreshToken);
    await deleteItem(SECURE_KEYS.userSession);
  },
};
