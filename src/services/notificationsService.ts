import apiClient from "./api";
import type { ApiResponse, Notification } from "../types/api";

export const notificationsService = {
  async getAll() {
    const res = await apiClient.get<ApiResponse<Notification[]>>("notifications");
    return res.data;
  },

  async markAsRead(id: string) {
    const res = await apiClient.patch<ApiResponse>(`notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead() {
    const res = await apiClient.patch<ApiResponse>("notifications/read-all");
    return res.data;
  },

  async sendBroadcast(title: string, message: string) {
    const res = await apiClient.post<ApiResponse>("notifications/broadcast", { title, message });
    return res.data;
  },
};
