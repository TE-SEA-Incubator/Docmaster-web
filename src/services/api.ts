import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  deleteToken,
  getRefreshToken,
  getToken,
  saveRefreshToken,
  saveToken,
  type TokenPortal,
} from "../utils/cookie";
import { emitToast } from "../utils/toastEmitter";

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "") + "/api/";
  }
  return "/api/";
};

const API_BASE_URL = resolveBaseUrl();

function getActivePortal(): TokenPortal {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return "admin";
  }
  return "user";
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {},
});

let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

const PUBLIC_AUTH_PATHS = ["/login", "/register", "/refresh-token", "/forgot-password", "/reset-password"];

apiClient.interceptors.request.use((config) => {
  const token = getToken(getActivePortal());
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function refreshAccessToken(portal: TokenPortal): Promise<string | null> {
  const refreshToken = getRefreshToken(portal);
  if (!refreshToken) return null;

  try {
    const response = await axios.post<{ success: boolean; token: string; refresh_token?: string }>(
      `${API_BASE_URL}auth/refresh-token`,
      { refresh_token: refreshToken },
      { withCredentials: true }
    );
    const newAccess = response.data?.token;
    const newRefresh = response.data?.refresh_token;
    if (!newAccess) return null;
    saveToken(newAccess, portal);
    if (newRefresh) saveRefreshToken(newRefresh, portal);
    return newAccess;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const is401 = error.response?.status === 401;
    const isPublicAuth =
      original?.url &&
      PUBLIC_AUTH_PATHS.some((path) => original.url?.includes(path));

    const portal = getActivePortal();

    if (is401 && original && !original._retry && !isPublicAuth) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshWaiters.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const token = await refreshAccessToken(portal);
        refreshWaiters.forEach((cb) => cb(token));
        refreshWaiters = [];
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        }
      } finally {
        isRefreshing = false;
      }
    }

    if (is401) {
      deleteToken(portal);
      if (portal === "user") {
        localStorage.removeItem("docmaster_user_session");
        localStorage.removeItem("dm_devices_cache");
      }
      if (portal === "admin") {
        localStorage.removeItem("docmaster_admin_login");
      }

      const isAdminRoute = window.location.pathname.startsWith("/admin");
      const loginRoute = isAdminRoute ? "/admin/login" : "/login";

      if (!window.location.pathname.includes(loginRoute)) {
        window.location.href = loginRoute;
      }
    } else if (!error.response) {
      emitToast({ type: "error", message: "Erreur réseau. Vérifiez votre connexion internet." });
    } else if (error.response.status >= 500) {
      emitToast({ type: "error", message: "Le serveur est temporairement indisponible. Veuillez réessayer." });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
