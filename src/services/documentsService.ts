import apiClient from "./api";
import type { ApiResponse, Document } from "../types/api";

export interface ShareData {
  id: string;
  document_id: string;
  share_token: string;
  shareUrl: string;
  expires_at: string | null;
  created_at: string;
}

export const documentsService = {
  async register(data: {
    type_id: string;
    numero: string;
    nom_complet?: string;
    date_naissance?: string;
    lieu_naissance?: string;
    photo_url?: string;
    recto_url?: string;
    verso_url?: string;
    date_delivrance?: string;
    date_expiration?: string;
    delivered_at?: string;
  }) {
    const res = await apiClient.post<ApiResponse<Document>>("documents", data);
    return res.data;
  },

  async getAll() {
    const res = await apiClient.get<ApiResponse<Document[]>>("documents");
    return res.data;
  },

  async getById(id: string) {
    const res = await apiClient.get<ApiResponse<Document>>(`documents/${id}`);
    return res.data;
  },

  async update(id: string, data: FormData, onProgress?: (percent: number) => void) {
    const res = await apiClient.put<ApiResponse<Document>>(`documents/${id}`, data, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return res.data;
  },

  async delete(id: string) {
    const res = await apiClient.delete<ApiResponse>(`documents/${id}`);
    return res.data;
  },

  // La route serveur est PATCH /documents/:id/lost ; le mot de passe y est vérifié quand il est fourni.
  async reportLost(id: string, password?: string) {
    const res = await apiClient.patch<ApiResponse<Document>>(`documents/${id}/lost`, { password });
    return res.data;
  },

  async createShare(documentId: string, daysValid?: number) {
    const res = await apiClient.post<ApiResponse<ShareData>>(`shares/${documentId}`, { daysValid });
    return res.data;
  },

  async getSharedDocument(token: string) {
    const res = await apiClient.get<ApiResponse<Document>>(`shares/public/${token}`);
    return res.data;
  },

  async getDocumentShares(docId: string) {
    const res = await apiClient.get<ApiResponse>(`shares/${docId}`);
    return res.data;
  },

  async revokeShare(shareId: string) {
    const res = await apiClient.delete<ApiResponse>(`shares/${shareId}`);
    return res.data;
  },
};
