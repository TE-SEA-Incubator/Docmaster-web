import apiClient from './apiClient';
import type { ApiResponse, Referral, ReferralStats } from '@/types';

export const referralsService = {
  async getMyReferrals() {
    const res = await apiClient.get<ApiResponse<{ referrals: Referral[]; stats: ReferralStats }>>('referrals');
    return res.data;
  },
};
