import apiClient from "./api";
import type { ApiResponse } from "../types/api";

export const statsService = {
  async getGlobal() {
    const res = await apiClient.get<ApiResponse>("declarations/stats");
    return res.data;
  },

  async getPerformance(period?: string) {
    const res = await apiClient.get<ApiResponse>("declarations/performance", {
      params: period ? { period } : undefined,
    });
    return res.data;
  },

  async getActiveDocumentTypes() {
    const res = await apiClient.get<ApiResponse>("document-types/active");
    return res.data;
  },
};
