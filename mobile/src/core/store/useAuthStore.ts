import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { authService } from '@/core/api/authService';
import { setTokens, clearTokens, saveSession, getSession } from '@/core/utils/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'docmaster_onboarding_completed';

type AuthState = {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  login: (email: string, mot_de_passe: string) => Promise<void>;
  register: (data: {
    nom: string;
    prenom: string;
    email: string;
    mot_de_passe: string;
    telephone?: string;
    pays?: string;
    ville?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  setUser: (user: UserProfile, token: string) => void;
  setLoading: (loading: boolean) => void;
  restoreSession: () => Promise<boolean>;
  completeOnboarding: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  hasCompletedOnboarding: false,

  login: async (email, mot_de_passe) => {
    console.log('[AuthStore] Attempting login for:', email);
    set({ isLoading: true });
    try {
      const res = await authService.loginUser({ email, mot_de_passe });

      // Support direct {token, user} et wrapper {success, data: {token, user}}
      const token = res?.data?.token ?? (res as any)?.token;
      const user  = res?.data?.user  ?? (res as any)?.user;

      if (token && user) {
        await setTokens(token, token);
        await saveSession(user as unknown as Record<string, unknown>);
        set({ user, token, isAuthenticated: true, isLoading: false });
        console.log('[AuthStore] Login successful, state updated');
      } else {
        console.warn('[AuthStore] Login response missing token/user:', JSON.stringify(res));
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      console.error('[AuthStore] Login exception:', error);
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authService.registerUser(data);

      const token = res?.data?.token ?? (res as any)?.token;
      const user  = res?.data?.user  ?? (res as any)?.user;

      if (token && user) {
        await setTokens(token, token);
        await saveSession(user as unknown as Record<string, unknown>);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        console.warn('[AuthStore] Register response missing token/user:', JSON.stringify(res));
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      console.error('[AuthStore] Register exception:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    await clearTokens();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  fetchProfile: async () => {
    try {
      const res = await authService.getProfile();

      const user = res?.data ?? (res as any)?.user ?? res;

      if (user && typeof user === 'object' && user.id) {
        await saveSession(user as unknown as Record<string, unknown>);
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setUser: async (user, token) => {
    await setTokens(token, token);
    await saveSession(user as unknown as Record<string, unknown>);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  restoreSession: async () => {
    console.log('[AuthStore] Restoring session...');
    try {
      const [session, onboarding] = await Promise.all([
        getSession(),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      
      console.log('[AuthStore] Persisted onboarding state:', onboarding);
      
      set({ 
        hasCompletedOnboarding: onboarding === 'true',
        isLoading: false 
      });

      if (session) {
        set({ user: session as unknown as UserProfile, isAuthenticated: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthStore] Restore session exception:', error);
      set({ isLoading: false });
      return false;
    }
  },

  completeOnboarding: async () => {
    console.log('[AuthStore] Marking onboarding as completed');
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    set({ hasCompletedOnboarding: true });
  },
}));
