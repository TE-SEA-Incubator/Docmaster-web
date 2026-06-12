import apiClient from "./api";
import type { ApiResponse, UserProfile } from "../types/api";

export type ProfileUpdateResponse = {
  message: string;
  user: UserProfile;
};

export const authService = {
  async registerUser(data: {
    nom: string;
    prenom: string;
    email: string;
    mot_de_passe: string;
    telephone?: string;
    pays?: string;
    ville?: string;
    code_parrainage?: string;
  }) {
    const res = await apiClient.post<ApiResponse & { token: string; user: UserProfile }>("auth/register", data);
    return res.data;
  },

  async loginUser(data: { email: string; mot_de_passe: string }) {
    const res = await apiClient.post<ApiResponse & { token: string; user: UserProfile }>("auth/login", data);
    return res.data;
  },

  async requestPasswordReset(data: { email: string }) {
    const res = await apiClient.post<ApiResponse>("auth/forgot-password", data);
    return res.data;
  },

  async resetPassword(data: { token: string; mot_de_passe: string }) {
    const res = await apiClient.post<ApiResponse>("auth/reset-password", {
      token: data.token,
      newPassword: data.mot_de_passe,
    });
    return res.data;
  },

  async sendVerificationPin(data: { email?: string; telephone?: string }) {
    const res = await apiClient.post<ApiResponse>("auth/send-verification-pin", data);
    return res.data;
  },

  async verifyEmailPin(data: { email: string; pin: string }) {
    const res = await apiClient.post<ApiResponse>("auth/verify-email-pin", data);
    return res.data;
  },

  async logout() {
    const res = await apiClient.post<ApiResponse>("auth/logout");
    return res.data;
  },

  async googleOAuthLogin(data: { credential: string }) {
    const res = await apiClient.post<ApiResponse & { token: string; user: UserProfile }>("auth/google", data);
    return res.data;
  },

  async getProfile() {
    const res = await apiClient.get<ApiResponse<UserProfile>>("auth/profile");
    return res.data;
  },

  async updateProfile(data: Partial<UserProfile> | FormData) {
    const res = await apiClient.put<ProfileUpdateResponse>("auth/profile", data);
    return res.data;
  },

  async getEarningsStats() {
    const res = await apiClient.get<ApiResponse>("auth/earnings-stats");
    return res.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await apiClient.put<ApiResponse & { success: boolean }>("auth/password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return res.data;
  },
};
