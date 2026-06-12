import apiClient from "./api";
import type { ApiResponse } from "../types/api";

export interface EarningsRecord {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  metadata: any;
  created_at: string;
}

export interface EarningsResponse {
  data: EarningsRecord[];
  total: number;
  limit: number;
  offset: number;
}

export const earningsService = {
  async getMyEarnings(limit = 50, offset = 0) {
    const res = await apiClient.get<ApiResponse<EarningsResponse>>("earnings", {
      params: { limit, offset },
    });
    return res.data;
  },
};
