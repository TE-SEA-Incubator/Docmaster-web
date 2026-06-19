import apiClient from './apiClient';
import type { ApiResponse, Transaction } from '@/types';

export interface EarningsRecord {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: string;
  description?: string;
  reference?: string;
  created_at: string;
}

export interface EarningsStats {
  total_points: number;
  points_breakdown: {
    declarations: { points: number; count: number; pts_per_unit: number };
    returns: { points: number; count: number };
    referrals: { points: number; count: number };
  };
  stats: { total_found: number; total_returned: number };
}

export const earningsService = {
  async getMyTransactions() {
    const res = await apiClient.get<ApiResponse<Transaction[]>>('payments/transactions');
    return res.data;
  },

  async getMyEarnings() {
    const res = await apiClient.get<ApiResponse<{ data: EarningsRecord[] }>>('earnings');
    return res.data;
  },

  async getEarningsStats() {
    const res = await apiClient.get<ApiResponse<EarningsStats>>('auth/earnings-stats');
    return res.data;
  },

  async getMinWithdrawal() {
    const res = await apiClient.get<ApiResponse<{ min_withdrawal_amount: number }>>('settings');
    return res.data;
  },
};
