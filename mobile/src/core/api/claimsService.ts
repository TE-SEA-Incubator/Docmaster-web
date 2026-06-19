import apiClient from './apiClient';
import type { ApiResponse, Claim } from '@/types';

export const claimsService = {
  async create(data: {
    declaration_id: string;
    nom_complet: string;
    email: string;
    telephone?: string;
    preuve_url?: string;
  }) {
    const res = await apiClient.post<ApiResponse<Claim>>('claims', data);
    return res.data;
  },

  async getActive(id: string) {
    const res = await apiClient.get<ApiResponse<Claim>>(`claims/${id}`);
    return res.data;
  },

  async validateRecoveryCode(data: { docId: string; code: string }) {
    const res = await apiClient.post<ApiResponse>('claims/validate', data);
    return res.data;
  },

  async payRecoveryFee(data: { docId: string; amount: number; paymentMethod: string; phone?: string }) {
    const res = await apiClient.post<ApiResponse>('claims/pay', data);
    return res.data;
  },
};
