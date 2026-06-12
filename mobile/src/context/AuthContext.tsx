import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { setUnauthorizedHandler } from "@/api/client";
import { SECURE_KEYS, getItem, setItem, tokenStore } from "@/lib/secureStore";
import { authService } from "@/services/authService";
import type { UserProfile } from "@/types/api";

interface AuthState {
  /** True while we validate a persisted token at startup. */
  isLoading: boolean;
  /** True once a valid session is established. */
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (email: string, motDePasse: string) => Promise<void>;
  register: (input: {
    nom: string;
    prenom: string;
    email: string;
    mot_de_passe: string;
    telephone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function cacheUser(user: UserProfile) {
  await setItem(SECURE_KEYS.userSession, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    await authService.logout();
    await tokenStore.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  // Let the API client trigger a forced logout on an unrecoverable 401.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Bootstrap: restore the session from SecureStore, then verify it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await tokenStore.getAccessToken();
        if (!token) return;

        // Hydrate instantly from the cached profile for a snappy launch...
        const cached = await getItem(SECURE_KEYS.userSession);
        if (cached && !cancelled) setUser(JSON.parse(cached) as UserProfile);

        // ...then confirm with the server (works from cache when offline).
        try {
          const fresh = await authService.getProfile();
          if (!cancelled) {
            setUser(fresh);
            await cacheUser(fresh);
          }
        } catch {
          // Offline or transient error: keep the cached user if we have one.
          if (!cached) await tokenStore.clear();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, motDePasse: string) => {
      const res = await authService.login(email, motDePasse);
      await tokenStore.setTokens(res.token, res.refreshToken);
      await cacheUser(res.user);
      setUser(res.user);
    },
    [],
  );

  const register = useCallback(
    async (input: {
      nom: string;
      prenom: string;
      email: string;
      mot_de_passe: string;
      telephone?: string;
    }) => {
      const res = await authService.register(input);
      await tokenStore.setTokens(res.token, res.refreshToken);
      await cacheUser(res.user);
      setUser(res.user);
    },
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(user),
      user,
      login,
      register,
      logout,
    }),
    [isLoading, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
