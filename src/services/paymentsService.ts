import apiClient from "./api";
import type { ApiResponse, Transaction } from "../types/api";

export interface SavedPaymentMethod {
  id: string;
  user_id: string;
  method_type: "MTN" | "ORANGE" | "BANK";
  account_name?: string;
  account_number: string;
  bank_name?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const paymentsService = {
  async getMyTransactions() {
    const res = await apiClient.get<ApiResponse<Transaction[]>>("payments/transactions");
    return res.data;
  },

  // Saved payment methods
  async getPaymentMethods() {
    const res = await apiClient.get<ApiResponse<SavedPaymentMethod[]>>("payment-methods");
    return res.data;
  },

  async createPaymentMethod(data: {
    method_type: string;
    account_number: string;
    account_name?: string;
    bank_name?: string;
    is_default?: boolean;
  }) {
    const res = await apiClient.post<ApiResponse<SavedPaymentMethod>>("payment-methods", data);
    return res.data;
  },

  async updatePaymentMethod(id: string, data: Partial<SavedPaymentMethod>) {
    const res = await apiClient.put<ApiResponse<SavedPaymentMethod>>(`payment-methods/${id}`, data);
    return res.data;
  },

  async deletePaymentMethod(id: string) {
    const res = await apiClient.delete<ApiResponse<void>>(`payment-methods/${id}`);
    return res.data;
  },

  async setDefaultPaymentMethod(id: string) {
    const res = await apiClient.put<ApiResponse<SavedPaymentMethod>>(`payment-methods/${id}/default`, {});
    return res.data;
  },

  async checkTransaction(externalRef: string) {
    const res = await apiClient.get(`payments/check/${externalRef}`);
    return res.data;
  },

  // Withdrawals
  async requestWithdrawal(data: {
    amount: number;
    paymentMethod: string;
    paymentDetails: string;
  }) {
    const res = await apiClient.post<ApiResponse<any>>("withdrawals/request", data);
    return res.data;
  },

  async getMyWithdrawals() {
    const res = await apiClient.get<ApiResponse<any[]>>("withdrawals/my-requests");
    return res.data;
  },
};
