import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { deleteToken, getRefreshToken, getToken, saveRefreshToken, saveToken } from "../utils/cookie";

const PARTNER_PORTAL = "partenaire" as const;

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "") + "/api/";
  }
  return "/api/";
};

const partenairesApi = axios.create({
  baseURL: resolveBaseUrl() + "partenaires",
  withCredentials: true,
  headers: {},
});

const partnerGeneralApi = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
  headers: {},
});

let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

const PUBLIC_AUTH_PATHS = [
  "/partenaire/connexion",
  "/partenaire/mot-de-passe-oublie",
  "/partenaire/reinitialisation",
];

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken(PARTNER_PORTAL);
  if (!refreshToken) return null;

  try {
    const response = await axios.post<{ success: boolean; data: { token: string; refresh_token?: string } }>(
      `${resolveBaseUrl()}partenaires/refresh-token`,
      { refresh_token: refreshToken },
      { withCredentials: true }
    );
    const newAccess = response.data?.data?.token;
    const newRefresh = response.data?.data?.refresh_token;
    if (!newAccess) return null;
    saveToken(newAccess, PARTNER_PORTAL);
    if (newRefresh) saveRefreshToken(newRefresh, PARTNER_PORTAL);
    return newAccess;
  } catch {
    return null;
  }
}

function attachPartnerAuth(client: ReturnType<typeof axios.create>) {
  client.interceptors.request.use((config) => {
    const token = getToken(PARTNER_PORTAL);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      const is401 = error.response?.status === 401;

      if (!is401 || !original || original._retry || original.url?.includes("/refresh-token") || original.url?.includes("/login")) {
        if (is401) {
          deleteToken(PARTNER_PORTAL);
          if (!PUBLIC_AUTH_PATHS.some((p) => window.location.pathname.startsWith(p))) {
            window.location.href = "/partenaire/connexion";
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshWaiters.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            original.headers.Authorization = `Bearer ${token}`;
            resolve(client(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const token = await refreshAccessToken();
        refreshWaiters.forEach((cb) => cb(token));
        refreshWaiters = [];
        if (!token) {
          deleteToken(PARTNER_PORTAL);
          if (!PUBLIC_AUTH_PATHS.some((p) => window.location.pathname.startsWith(p))) {
            window.location.href = "/partenaire/connexion";
          }
          return Promise.reject(error);
        }
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      } finally {
        isRefreshing = false;
      }
    }
  );
}

attachPartnerAuth(partenairesApi);
attachPartnerAuth(partnerGeneralApi);

export interface PartenaireSession {
  id: string;
  nom_organisation: string;
  email: string;
  telephone?: string | null;
  nom_contact?: string | null;
  prenom_contact?: string | null;
  ville?: string | null;
  region?: string | null;
  adresse?: string | null;
  logo_url?: string | null;
  statut: "ACTIF" | "SUSPENDU" | "INACTIF";
  must_change_password: boolean;
  wallet_balance: number;
  points?: number;
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PartenaireStats {
  total_declarations: number;
  found: number;
  matched: number;
  returned: number;
  available: number;
  wallet_balance: number;
  total_points?: number;
}

export interface PartenaireDeclaration {
  id: string;
  identifiant_doc_dm?: string | null;
  doc_type?: string | null;
  doc_type_name?: string | null;
  doc_type_code?: string | null;
  owner_name: string;
  document_number?: string | null;
  status?: string | null;
  ville?: string | null;
  quartier?: string | null;
  description?: string | null;
  photo_recto?: string | null;
  photo_verso?: string | null;
  created_at: string;
}

export interface PartenaireWalletTransaction {
  id: string;
  partenaire_id: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  type: "CREDIT" | "DEBIT";
  reason: string;
  reference_id?: string | null;
  reference_type?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface PartenaireWallet {
  balance: number;
  history: PartenaireWalletTransaction[];
}

export interface PartenaireEarning {
  id: string;
  partenaire_id: string;
  type: string;
  amount: string | number;
  currency: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface PartenaireEarningsStats {
  wallet_balance: number;
  total_points: number;
  points_breakdown: {
    declarations: { points: number; count: number; pts_per_unit: number };
    returns: { points: number; count: number };
    referrals: { points: number; count: number };
  };
  stats: {
    total_found: number;
    total_returned: number;
    total_matched: number;
    total_available: number;
  };
}

export const partenairesService = {
  login(email: string, motDePasse: string) {
    return partenairesApi.post<{ success: boolean; data: { token: string; refresh_token?: string; partenaire: PartenaireSession } }>("/login", {
      email,
      mot_de_passe: motDePasse,
    });
  },

  refreshToken(refreshToken: string) {
    return partenairesApi.post<{ success: boolean; data: { token: string; refresh_token?: string } }>("/refresh-token", {
      refresh_token: refreshToken,
    });
  },

  logout(refreshToken?: string | null) {
    return partenairesApi.post<{ success: boolean; message: string }>("/logout", refreshToken ? { refresh_token: refreshToken } : undefined);
  },

  forgotPassword(email: string) {
    return partenairesApi.post<{ success: boolean; message: string }>("/forgot-password", { email });
  },

  resetPassword(token: string, nouveauMotDePasse: string) {
    return partenairesApi.post<{ success: boolean; message: string }>("/reset-password", {
      token,
      nouveau_mot_de_passe: nouveauMotDePasse,
    });
  },

  me() {
    return partenairesApi.get<{ success: boolean; data: PartenaireSession }>("/me");
  },

  updateProfile(payload: Partial<Pick<PartenaireSession, "nom_organisation" | "telephone" | "nom_contact" | "prenom_contact" | "adresse" | "ville" | "region">>) {
    return partenairesApi.put<{ success: boolean; data: PartenaireSession }>("/profil", payload);
  },

  changePassword(ancienMotDePasse: string, nouveauMotDePasse: string) {
    return partenairesApi.post<{ success: boolean; message: string }>("/change-password", {
      ancien_mot_de_passe: ancienMotDePasse,
      nouveau_mot_de_passe: nouveauMotDePasse,
    });
  },

  getStats() {
    return partenairesApi.get<{ success: boolean; data: PartenaireStats }>("/stats");
  },

  getDeclarations(params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    doc_type?: string;
  }) {
    return partenairesApi.get<{ success: boolean; rows: PartenaireDeclaration[]; total: number; page: number; limit: number }>(
      "/declarations",
      { params }
    );
  },

  createDeclaration(formData: FormData) {
    return partenairesApi.post<{ success: boolean; message: string; data: PartenaireDeclaration }>("/declarations", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteDeclaration(declarationId: string) {
    return partenairesApi.delete<{ success: boolean; message: string }>(`/declarations/${declarationId}`);
  },

  getWallet(params?: { limit?: number; offset?: number }) {
    return partenairesApi.get<{ success: boolean; data: PartenaireWallet }>("/wallet", { params });
  },

  getEarningsStats() {
    return partenairesApi.get<{ success: boolean; data: PartenaireEarningsStats }>("/earnings-stats");
  },

  getEarnings(params?: { limit?: number; offset?: number }) {
    return partenairesApi.get<{ success: boolean; data: { data: PartenaireEarning[]; total: number; limit: number; offset: number } }>(
      "/earnings",
      { params }
    );
  },

  getPointsHistory(params?: { 
    limit?: number; 
    offset?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
  }) {
    return partenairesApi.get<{ 
      success: boolean; 
      data: { 
        history: PartenaireEarning[]; 
        total: number; 
        limit: number; 
        offset: number;
      } 
    }>("/points/history", { params });
  },

  getPointsRate() {
    return partnerGeneralApi.get<{ success: boolean; rate: number }>("points/rate");
  },

  convertPoints(amountPoints: number) {
    return partenairesApi.post<{ success: boolean; data: { amountPoints: number; amountXaf: number; rate: number; wallet_balance: number; points: number } }>(
      "/points/convert",
      { amountPoints }
    );
  },

  requestWithdrawal(payload: { amount: number; payment_method: string; phone: string }) {
    return partenairesApi.post<{ success: boolean; message: string; data: any }>("/withdrawals/request", payload);
  },

  getWithdrawals(params?: { limit?: number; offset?: number }) {
    return partenairesApi.get<{ success: boolean; data: { withdrawals: any[]; total: number; limit: number; offset: number } }>(
      "/withdrawals",
      { params }
    );
  },

  getSettings() {
    return partnerGeneralApi.get<{ success: boolean; data: Record<string, any> }>("settings");
  },

  getRenderContext(declarationId: string) {
    return partnerGeneralApi
      .get<{ success: boolean; data: Record<string, any> }>(`declarations/${declarationId}/render-context`)
      .then((res) => res.data);
  },

  validateRecovery(declarationId: string, code: string) {
    return partnerGeneralApi
      .post<{ success: boolean; message?: string }>(`declarations/${declarationId}/validate-recovery`, { code })
      .then((res) => res.data);
  },
};

export default partenairesApi;
export { partnerGeneralApi };
