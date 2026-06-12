import { apiClient } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import type { AuthResponse, UserProfile } from "@/types/api";

/**
 * Auth API surface. The backend expects the French field name
 * `mot_de_passe` for the password (mirrors the web app).
 */
export const authService = {
  async login(email: string, motDePasse: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(endpoints.auth.login, {
      email,
      mot_de_passe: motDePasse,
    });
    return data;
  },

  async register(input: {
    nom: string;
    prenom: string;
    email: string;
    mot_de_passe: string;
    telephone?: string;
    pays?: string;
    ville?: string;
    code_parrainage?: string;
  }): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(
      endpoints.auth.register,
      input,
    );
    return data;
  },

  async getProfile(): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile | { user: UserProfile }>(
      endpoints.auth.profile,
    );
    // Backend may return the user directly or wrapped in `{ user }`.
    return "user" in data ? data.user : data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(endpoints.auth.logout);
    } catch {
      // A failed logout call must never block local sign-out.
    }
  },
};
