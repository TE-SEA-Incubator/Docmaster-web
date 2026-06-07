import apiClient from "./api";
import type { ApiResponse } from "../types/api";

export const smsService = {
  async getBalance() {
    const res = await apiClient.get<ApiResponse>("sms/balance");
    return res.data;
  },

  async getUsage() {
    const res = await apiClient.get<ApiResponse>("sms/usage");
    return res.data;
  },

  async getPurchaseHistory() {
    const res = await apiClient.get<ApiResponse>("sms/purchase-history");
    return res.data;
  },
};
