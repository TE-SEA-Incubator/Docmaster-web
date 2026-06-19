import apiClient from "./api";
import type { ApiResponse, Device } from "../types/api";

export const devicesService = {
  async register(data: FormData | {
    serial_number: string;
    brand?: string;
    model?: string;
    type: string;
    imei?: string;
  }) {
    const isFormData = data instanceof FormData;
    const res = await apiClient.post<ApiResponse<Device>>("devices", data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return res.data;
  },

  async getAll() {
    const res = await apiClient.get<ApiResponse<Device[]>>("devices");
    return res.data;
  },

  async getMyDevices() {
    const res = await apiClient.get<ApiResponse<Device[]>>("devices/my-devices");
    return res.data;
  },

  async registerMyDevice(formData: FormData) {
    try {
      const res = await apiClient.post<ApiResponse<Device>>("devices/my-devices", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  async reportLost(serial: string) {
    const res = await apiClient.patch<ApiResponse>(`devices/${serial}/report-lost`);
    return res.data;
  },

  async reportDeviceLost(id: string, password: string, status: string) {
    const res = await apiClient.patch<ApiResponse>(`devices/${id}/report-lost`, { password, status });
    return res.data;
  },

  async reportFound(serial: string) {
    const res = await apiClient.patch<ApiResponse>(`devices/${serial}/report-found`);
    return res.data;
  },

  async reportDeviceFound(id: string, password: string) {
    const res = await apiClient.patch<ApiResponse>(`devices/${id}/report-found`, { password });
    return res.data;
  },

  async verify(code: string, serial: string) {
    const res = await apiClient.post<ApiResponse>("devices/verify", { code, serial_number: serial });
    return res.data;
  },

  async verifyDevice(identifier: string) {
    const res = await apiClient.get<ApiResponse>(`devices/verify/${identifier}`);
    return res.data;
  },

  async delete(id: string) {
    const res = await apiClient.delete<ApiResponse>(`devices/${id}`);
    return res.data;
  },
};
