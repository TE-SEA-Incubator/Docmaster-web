import apiClient from './apiClient';
import type { ApiResponse, Transaction } from '@/types';

export const paymentsService = {
  async getMyTransactions() {
    const res = await apiClient.get<ApiResponse<Transaction[]>>('payments/transactions');
    return res.data;
  },
};
