import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import Constants from "expo-constants";

import { tokenStore } from "@/lib/secureStore";

/**
 * Resolves the API base URL.
 * Priority: EXPO_PUBLIC_API_URL env -> app.json extra.apiBaseUrl -> hardcoded default.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl;
  const url = fromEnv || fromExtra || "https://api-v2.docmaster.net/api";
  // Normalize: drop trailing slashes so endpoint joins are predictable.
  return url.replace(/\/+$/, "");
}

export const API_BASE_URL = resolveBaseUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { Accept: "application/json" },
});

/**
 * Hook the app can register to react to a hard 401 (e.g. force logout).
 * Set by AuthContext at mount so the client stays decoupled from React.
 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// --- Request interceptor: inject the Bearer token from SecureStore. ---
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// --- Response interceptor: transparent refresh-token rotation on 401. ---
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Bare axios call (not apiClient) to avoid the interceptor recursion.
    const { data } = await axios.post<{ token: string; refreshToken?: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 20_000 },
    );
    if (data?.token) {
      await tokenStore.setTokens(data.token, data.refreshToken);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isAuthEndpoint = original?.url?.includes("/auth/");

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      // De-duplicate concurrent refreshes into a single in-flight request.
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return apiClient(original);
      }

      await tokenStore.clear();
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);
