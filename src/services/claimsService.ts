import apiClient from "./api";
import type { ApiResponse, Claim } from "../types/api";

export const claimsService = {
  async create(data: {
    declaration_id: string;
    nom_complet: string;
    email: string;
    telephone?: string;
    preuve_url?: string;
  }) {
    const res = await apiClient.post<ApiResponse<Claim>>("claims", data);
    return res.data;
  },

  async getActive(id: string) {
    const res = await apiClient.get<ApiResponse<Claim>>(`claims/${id}`);
    return res.data;
  },

  async validateRecoveryCode(data: { claim_id: string; code: string }) {
    const res = await apiClient.post<ApiResponse>("claims/validate", {
      docId: data.claim_id,
      code: data.code,
    });
    return res.data;
  },

  async payRecoveryFee(data: { claim_id: string; method: string }) {
    const res = await apiClient.post<ApiResponse>("claims/pay", data);
    return res.data;
  },
};
