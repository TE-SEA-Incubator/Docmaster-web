import apiClient from './apiClient';
import type { ApiResponse, Transaction } from '@/types';

export interface WithdrawalRequest {
  amount: number;
  payment_method: string;
  payment_details: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_details: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  admin_note?: string;
  created_at: string;
  updated_at?: string;
}

export const paymentsService = {
  async getMyTransactions() {
    const res = await apiClient.get<ApiResponse<Transaction[]>>('payments/transactions');
    return res.data;
  },

  async requestWithdrawal(data: WithdrawalRequest) {
    const res = await apiClient.post<ApiResponse<Withdrawal>>('withdrawals/request', data);
    return res.data;
  },

  async getMyWithdrawals() {
    const res = await apiClient.get<ApiResponse<Withdrawal[]>>('withdrawals/my-requests');
    return res.data;
  },
};
