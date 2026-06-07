import apiClient from "./api";
import type { ApiResponse, Declaration, DocTypeCatalog } from "../types/api";

export type { Declaration };

export const documentTypesService = {
  async getActive() {
    const res = await apiClient.get<ApiResponse<DocTypeCatalog[]>>("document-types/active");
    return res.data;
  },
};

export const declarationsService = {
  async createLost(data: Record<string, any> | FormData) {
    const res = await apiClient.post<ApiResponse<Declaration>>("declarations/lost", data);
    return res.data;
  },

  async createFound(data: Record<string, any> | FormData) {
    const res = await apiClient.post<ApiResponse<Declaration>>("declarations/found", data);
    return res.data;
  },

  async getMyDeclarations() {
    const res = await apiClient.get<ApiResponse<Declaration[]>>("declarations/me");
    return res.data;
  },

  async getAll(params?: { page?: number; limit?: number; search?: string; declaration_type?: string; status?: string }) {
    const res = await apiClient.get<ApiResponse<Declaration[]>>("declarations", { params });
    return res.data;
  },

  async getById(id: string) {
    const res = await apiClient.get<ApiResponse<Declaration>>(`declarations/${id}`);
    return res.data;
  },

  async searchPublic(query: string) {
    const res = await apiClient.get<ApiResponse<Declaration[]>>("declarations/search-public", {
      params: { q: query },
    });
    return res.data;
  },

  async getStats() {
    const res = await apiClient.get<ApiResponse>("declarations/stats");
    return res.data;
  },

  async initiateRecovery(data: { declaration_id: string; email?: string; telephone?: string }) {
    const res = await apiClient.post<ApiResponse>("declarations/recover", data);
    return res.data;
  },

  async payRecoveryFee(data: { declaration_id: string; method: string; telephone: string }) {
    const res = await apiClient.post<ApiResponse>("declarations/pay-recovery", data);
    return res.data;
  },

  async checkPaymentStatus(declarationId: string) {
    const res = await apiClient.get<ApiResponse>(`declarations/payment-status/${declarationId}`);
    return res.data;
  },

  async getDeletionRequests() {
    const res = await apiClient.get<ApiResponse>("declarations/deletion-requests");
    return res.data;
  },

  async requestDeletion(data: { declaration_id: string; reason: string }) {
    const res = await apiClient.post<ApiResponse>("declarations/deletion-requests", data);
    return res.data;
  },

  async delete(id: string) {
    const res = await apiClient.delete<ApiResponse>(`declarations/${id}`);
    return res.data;
  },
};
