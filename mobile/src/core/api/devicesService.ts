import apiClient from './apiClient';
import type { ApiResponse, Device } from '@/types';

export const devicesService = {
  async getMyDevices() {
    const res = await apiClient.get<ApiResponse<Device[]>>('devices/my');
    return res.data;
  },

  async getAll() {
    const res = await apiClient.get<ApiResponse<Device[]>>('devices');
    return res.data;
  },

  async getById(id: string) {
    const res = await apiClient.get<ApiResponse<Device>>(`devices/${id}`);
    return res.data;
  },

  async registerMyDevice(data: FormData | Record<string, unknown>) {
    const res = await apiClient.post<ApiResponse<Device>>('devices', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return res.data;
  },

  async update(id: string, data: FormData | Record<string, unknown>) {
    const res = await apiClient.put<ApiResponse<Device>>(`devices/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return res.data;
  },

  async delete(id: string) {
    const res = await apiClient.delete<ApiResponse>(`devices/${id}`);
    return res.data;
  },

  async reportDeviceLost(id: string, password: string, type: string) {
    const res = await apiClient.patch<ApiResponse>(`devices/${id}/report-lost`, { password, type });
    return res.data;
  },

  async reportDeviceFound(id: string, password: string) {
    const res = await apiClient.patch<ApiResponse>(`devices/${id}/report-found`, { password });
    return res.data;
  },

  async verifyDevice(imei: string) {
    const res = await apiClient.get<ApiResponse>(`devices/verify/${encodeURIComponent(imei)}`);
    return res.data;
  },
};
