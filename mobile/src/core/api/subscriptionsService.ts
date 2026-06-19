import apiClient from './apiClient';
import type { ApiResponse, Plan } from '@/types';

export const subscriptionsService = {
  async getAllPlans() {
    const res = await apiClient.get<ApiResponse<Plan[]>>('/plans');
    return res.data;
  },

  async getUsage() {
    const res = await apiClient.get<ApiResponse<any>>('/subscriptions/usage');
    return res.data;
  },

  async subscribe(data: {
    planId: string;
    months: number;
    paymentMethod: string;
    phone: string;
  }) {
    const res = await apiClient.post<ApiResponse<any>>('/subscriptions/subscribe', data);
    return res.data;
  },

  async cancel() {
    const res = await apiClient.post<ApiResponse<any>>('/subscriptions/cancel');
    return res.data;
  },
};
