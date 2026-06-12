import apiClient from "./api";
import type { ApiResponse, Plan, Subscription } from "../types/api";

export const subscriptionsService = {
  async getAllPlans() {
    const res = await apiClient.get<ApiResponse<Plan[]>>("plans");
    return res.data;
  },

  async getPlanById(id: string) {
    const res = await apiClient.get<ApiResponse<Plan>>(`plans/${id}`);
    return res.data;
  },

  async getFeatureDefinitions() {
    const res = await apiClient.get<ApiResponse>("plans/features/definitions");
    return res.data;
  },

  async getMySubscription() {
    const res = await apiClient.get<ApiResponse<Subscription>>("subscriptions/my-subscription");
    return res.data;
  },

  async subscribe(data: { planId: string; months?: number; paymentMethod?: string; phone?: string }) {
    const res = await apiClient.post<ApiResponse<Subscription>>("subscriptions/subscribe", data);
    return res.data;
  },

  async getUsage(userId?: string) {
    const params = userId ? { userId } : {};
    const res = await apiClient.get<ApiResponse>("subscriptions/usage", { params });
    return res.data;
  },
};
