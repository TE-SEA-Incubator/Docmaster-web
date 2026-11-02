import apiClient from "./api";
import type { AxiosRequestConfig } from "axios";
import type { ApiResponse, Declaration, DocTypeCatalog } from "../types/api";

export type { Declaration };

export const documentTypesService = {
  async getActive() {
    const res = await apiClient.get<ApiResponse<DocTypeCatalog[]>>("document-types/active");
    return res.data;
  },
};

export const declarationsService = {
  async createLost(data: Record<string, any> | FormData, config?: AxiosRequestConfig) {
    const res = await apiClient.post<ApiResponse<Declaration>>("declarations/lost", data, config);
    return res.data;
  },

  async createFound(data: Record<string, any> | FormData, config?: AxiosRequestConfig) {
    const res = await apiClient.post<ApiResponse<Declaration>>("declarations/found", data, config);
    return res.data;
  },

  async update(id: string, data: Record<string, any>) {
    const res = await apiClient.patch<ApiResponse<Declaration>>(`declarations/${id}`, data);
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

  async getRenderContext(id: string, foundId?: string, matchId?: string) {
    const params = foundId || matchId ? { ...(foundId ? { found: foundId } : {}), ...(matchId ? { match: matchId } : {}) } : undefined;
    const res = await apiClient.get<ApiResponse<Declaration>>(`declarations/${id}/render-context`, {
      params,
    });
    return res.data;
  },

  async getMatches(id: string) {
    const res = await apiClient.get<ApiResponse<any>>(`declarations/${id}/matches`);
    return res.data;
  },

  async confirmMatch(id: string, matchId: string) {
    const res = await apiClient.post<ApiResponse<any>>(`declarations/${id}/confirm-match`, { matchId });
    return res.data;
  },

  async rejectMatch(id: string, matchId: string) {
    const res = await apiClient.post<ApiResponse<any>>(
      `declarations/${id}/matches/${matchId}/reject`,
    );
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

  async payRecoveryFee(data: { docId: string; paymentMethod: string; phone: string; amount?: number; matchId?: string }) {
    const res = await apiClient.post<ApiResponse>("payments/pay-recovery", data);
    return res.data;
  },

  async checkPaymentStatus(docId: string) {
    const res = await apiClient.get<ApiResponse>("payments/transactions");
    const transactions = (res.data as any)?.transactions ?? (res.data as any)?.data ?? [];
    const match = transactions.find((tx: any) => {
      const metadata = typeof tx.metadata === "string" ? JSON.parse(tx.metadata || "{}") : tx.metadata || {};
      return metadata.docId === docId || metadata.doc_id === docId;
    });
    return { success: true, data: match ?? null };
  },

  async validateRecoveryCode(data: { docId: string; code: string }) {
    const res = await apiClient.post<ApiResponse>("claims/validate", data);
    return res.data;
  },

  async validateRecovery(id: string, code: string) {
    const res = await apiClient.post<ApiResponse>(`declarations/${id}/validate-recovery`, { code });
    return res.data;
  },

  async getDeletionRequests() {
    const res = await apiClient.get<ApiResponse>("deletion-requests/me");
    return res.data;
  },

  async requestDeletion(data: { declaration_id: string; reason: string }) {
    const res = await apiClient.post<ApiResponse>(
      `deletion-requests/declarations/${data.declaration_id}/request-deletion`,
      { reason: data.reason }
    );
    return res.data;
  },

  async delete(id: string) {
    const res = await apiClient.delete<ApiResponse>(`declarations/${id}`);
    return res.data;
  },
};
