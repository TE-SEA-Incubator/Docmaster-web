import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'docmaster_jwt_token';
const SESSION_KEY = 'docmaster_user_session';

export const setTokens = async (accessToken: string, refreshToken: string) => {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync('refresh_token', refreshToken);
};

export const getAccessToken = async () => SecureStore.getItemAsync(TOKEN_KEY);
export const getRefreshToken = async () => SecureStore.getItemAsync('refresh_token');

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync('refresh_token');
  await SecureStore.deleteItemAsync(SESSION_KEY);
};

export const saveSession = async (user: Record<string, unknown>) => {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(user));
};

export const getSession = async (): Promise<Record<string, unknown> | null> => {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
