import apiClient from './apiClient';
import type { ApiResponse } from '@/types';

export type GlobalStats = {
  total_lost?: number;
  total_recovered?: number;
  total_declarations?: number;
  total_users?: number;
  total_documents?: number;
  total_devices?: number;
};

export type PerformanceDoc = {
  name: string;
  count: number;
  previous_count?: number;
  trend?: number;
  recent_items?: Array<{
    id?: string;
    type: 'LOST' | 'FOUND';
    date?: string;
    ville?: string;
  }>;
};

export const statsService = {
  async getGlobal() {
    const res = await apiClient.get<ApiResponse<GlobalStats>>('stats/global');
    return res.data;
  },
  async getPerformance() {
    const res = await apiClient.get<ApiResponse<PerformanceDoc[]>>('stats/performance');
    return res.data;
  },
  async getActiveDocumentTypes() {
    const res = await apiClient.get<ApiResponse>('document-types/active');
    return res.data;
  },
};
