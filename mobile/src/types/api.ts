/**
 * API contract types. Kept intentionally close to the web app
 * (web: src/types/api.ts) so both clients stay in sync.
 */

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: UserProfile;
  message?: string;
}

export interface UserProfile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  pays?: string;
  ville?: string;
  code_invitation?: string;
  is_verified?: boolean;
  points?: number;
  wallet_balance?: number;
  photo_url?: string;
  currency?: string;
  role?: string;
  created_at?: string;
}

export interface Document {
  id: string;
  type_id?: string;
  type_doc?: string;
  nom_sur_doc?: string;
  numero_doc?: string;
  photo_recto?: string;
  photo_verso?: string;
  is_lost?: boolean;
  is_verified?: boolean;
  date_delivrance?: string;
  date_expiration?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

/** Payload accepted by POST /documents (mirrors web documentsService.register). */
export interface CreateDocumentInput {
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
}
