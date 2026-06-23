import apiClient from './apiClient';
import type { ApiResponse, Document } from '@/types';

export interface ShareResponse {
  id: string;
  document_id: string;
  user_id: string;
  share_token: string;
  expires_at: string | null;
  is_revoked: boolean;
  view_count: number;
  created_at: string;
  shareUrl: string;
}

export const documentsService = {
  async register(data: {
    type_doc: string;
    numero_doc: string;
    nom_sur_doc?: string;
    nom_autorite?: string;
    date_delivrance?: string;
    date_expiration?: string;
    photo_recto?: string;
    photo_verso?: string;
    notes?: string;
    validity_option?: 'EXPIRING' | 'PERMANENT';
    custom_type_name?: string;
    is_archived?: boolean;
  }) {
    const formData = new FormData();
    formData.append('type_doc', data.type_doc);
    formData.append('numero_doc', data.numero_doc);
    if (data.nom_sur_doc) formData.append('nom_sur_doc', data.nom_sur_doc);
    if (data.nom_autorite) formData.append('nom_autorite', data.nom_autorite);
    if (data.date_delivrance) formData.append('date_delivrance', data.date_delivrance);
    if (data.date_expiration) formData.append('date_expiration', data.date_expiration);
    if (data.notes) formData.append('notes', data.notes);
    if (data.validity_option) formData.append('validity_option', data.validity_option);
    if (data.custom_type_name) formData.append('custom_type_name', data.custom_type_name);
    // Si la date d'expiration est déjà dépassée à la soumission, on archive
    // directement (le backend applique aussi cette logique en défense en profondeur).
    if (data.is_archived) formData.append('is_archived', 'true');

    if (data.photo_recto) {
      formData.append('photo_recto', {
        uri: data.photo_recto,
        type: 'image/jpeg',
        name: 'recto.jpg',
      } as any);
    }
    if (data.photo_verso) {
      formData.append('photo_verso', {
        uri: data.photo_verso,
        type: 'image/jpeg',
        name: 'verso.jpg',
      } as any);
    }

    const res = await apiClient.post<ApiResponse<Document>>('documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async getAll() {
    const res = await apiClient.get<ApiResponse<Document[]>>('documents');
    return res.data;
  },

  async getById(id: string) {
    const res = await apiClient.get<ApiResponse<Document>>(`documents/${id}`);
    return res.data;
  },

  async delete(id: string) {
    const res = await apiClient.delete<ApiResponse>(`documents/${id}`);
    return res.data;
  },

  async reportLost(id: string) {
    const res = await apiClient.patch<ApiResponse>(`documents/${id}/report-lost`);
    return res.data;
  },

  /**
   * Archive immediately a single document (only effective if its date_expiration
   * has passed and validity_option='EXPIRING'). Used to avoid waiting for the
   * 2 AM cron job.
   */
  async archive(id: string) {
    const res = await apiClient.patch<ApiResponse<Document>>(`documents/${id}/archive`);
    return res.data;
  },

  async createShare(documentId: string, daysValid?: number) {
    const res = await apiClient.post<ApiResponse<ShareResponse>>(`shares/${documentId}`, { daysValid });
    return res.data;
  },

  async getSharedDocument(token: string) {
    const res = await apiClient.get<ApiResponse>(`shares/public/${token}`);
    return res.data;
  },

  async getDocumentShares(docId: string) {
    const res = await apiClient.get<ApiResponse<ShareResponse[]>>(`shares/${docId}`);
    return res.data;
  },

  async revokeShare(shareId: string) {
    const res = await apiClient.delete<ApiResponse>(`shares/${shareId}`);
    return res.data;
  },
};
