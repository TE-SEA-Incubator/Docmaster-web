import apiClient from "./api";
import type { ApiResponse, Claim } from "../types/api";

export interface RecoveryStatusData {
  id?: string;
  doc_id: string;
  status: string;
  created_at?: string;
  paid: boolean;
  verification_code?: string;
  isOwner?: boolean;
  isFinder?: boolean;
  declaration?: any;
}

export const claimsService = {
  /**
   * Créer manuellement un claim / réclamation
   */
  async create(data: {
    declaration_id: string;
    ownerId: string;
    finderId: string;
  }) {
    const res = await apiClient.post<ApiResponse<Claim>>("claims", {
      docId: data.declaration_id,
      ownerId: data.ownerId,
      finderId: data.finderId,
    });
    return res.data;
  },

  /**
   * Récupérer le claim actif par son ID ou ID du document
   */
  async getActive(id: string) {
    const res = await apiClient.get<ApiResponse<Claim>>(`claims/${id}`);
    return res.data;
  },

  /**
   * Obtenir le statut de récupération unifié et le code secret (si propriétaire)
   */
  async getRecoveryStatus(docId: string) {
    try {
      const res = await apiClient.get<ApiResponse<RecoveryStatusData>>(`recovery/status/${docId}`);
      return res.data;
    } catch {
      const fallback = await apiClient.get<ApiResponse<Claim>>(`claims/${docId}`);
      return fallback.data;
    }
  },

  /**
   * Valider le code secret de remise (Trouveur / Partenaire)
   */
  async validateRecoveryCode(data: { claim_id?: string; docId?: string; code: string }) {
    const targetDocId = data.docId || data.claim_id;
    const res = await apiClient.post<ApiResponse>("recovery/validate", {
      docId: targetDocId,
      code: data.code,
    });
    return res.data;
  },

  /**
   * Payer les frais de récupération (Propriétaire) via MoMo, OM ou Points
   */
  async payRecoveryFee(data: { claim_id?: string; docId?: string; method?: string; paymentMethod?: string; phone?: string; amount?: number }) {
    const targetDocId = data.docId || data.claim_id;
    const targetMethod = data.paymentMethod || data.method || "MTN_MOMO";
    const res = await apiClient.post<ApiResponse>("recovery/pay", {
      docId: targetDocId,
      paymentMethod: targetMethod,
      phone: data.phone,
      amount: data.amount,
    });
    return res.data;
  },
};

export default claimsService;
