import apiClient from "./api";

interface Autorite {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  niveau: "HAUTE" | "NORMAL";
  ville: string;
  region?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  [key: string]: unknown;
}

interface Partenaire {
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
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface PartenaireWalletTransaction {
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
  [key: string]: unknown;
}

interface DashboardStats {
  total_users?: number;
  total_declarations?: number;
  total_subscriptions?: number;
  total_revenue?: number;
  active_users?: number;
  [key: string]: unknown;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  features?: Record<string, any>;
  duration_months?: number;
  is_featured?: boolean;
  is_active?: boolean;
  [key: string]: unknown;
}

interface FeatureDefinition {
  code: string;
  label: string;
  type: "boolean" | "number" | "string";
  description?: string;
}

interface DocumentType {
  id: string;
  label: string;
  icon?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  [key: string]: unknown;
}

interface Setting {
  key: string;
  value: string;
  [key: string]: unknown;
}

interface Referral {
  id: string;
  referrer_name?: string;
  referred_name?: string;
  status?: string;
  reward?: number;
  [key: string]: unknown;
}

interface Transaction {
  id: string;
  user_id?: string;
  amount: number;
  method?: string;
  payment_method?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface Subscription {
  id: string;
  user_id?: string;
  plan_name?: string;
  status?: string;
  expiry_date?: string;
  [key: string]: unknown;
}

interface AdminUser {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  is_active?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

interface MatchCriterion {
  name: string;
  points: number;
  max: number;
  matched: boolean;
  icon: string;
  detail?: string;
}

interface RecentMatch {
  id: string;
  lost_declaration_id: string;
  found_declaration_id: string;
  score: number;
  status: string;
  created_at: string;
  details?: { criteria: MatchCriterion[] } | null;
  lost_identifiant: string;
  lost_owner_name: string;
  lost_doc_type: string;
  lost_ville: string;
  lost_quartier: string;
  found_identifiant: string;
  found_owner_name: string;
  found_doc_type: string;
  found_ville: string;
  found_quartier: string;
}

interface MatchingStats {
  totalMatches: number;
  highConfidence: number;
  potential: number;
  averageScore: number;
}

export const adminService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await apiClient.get("subscriptions/admin/stats");
    return res.data.data;
  },

  async getAllSubscriptions(): Promise<Subscription[]> {
    const res = await apiClient.get("subscriptions/admin/all");
    return res.data.data;
  },

  async updateSubscriptionStatus(id: string, status: string): Promise<unknown> {
    const res = await apiClient.patch(`subscriptions/admin/${id}/status`, { status });
    return res.data.data;
  },

  async getPlans(): Promise<Plan[]> {
    const res = await apiClient.get("plans");
    return res.data.data;
  },

  async updatePlan(id: string, data: Partial<Plan>): Promise<unknown> {
    const res = await apiClient.put(`plans/${id}`, data);
    return res.data.data;
  },

  async getPlanById(id: string): Promise<Plan> {
    const res = await apiClient.get(`plans/${id}`);
    return res.data.data;
  },

  async createPlan(data: Partial<Plan>): Promise<unknown> {
    const res = await apiClient.post("plans", data);
    return res.data.data;
  },

  async getFeatureDefinitions(): Promise<FeatureDefinition[]> {
    const res = await apiClient.get("plans/features/definitions");
    return res.data.data;
  },

  async getDocumentTypes(): Promise<DocumentType[]> {
    const res = await apiClient.get("document-types");
    return res.data.data;
  },

  async createDocumentType(data: Partial<DocumentType>): Promise<unknown> {
    const res = await apiClient.post("document-types", data);
    return res.data.data;
  },

  async updateDocumentType(id: string, data: Partial<DocumentType>): Promise<unknown> {
    const res = await apiClient.put(`document-types/${id}`, data);
    return res.data.data;
  },

  async toggleDocumentType(id: string): Promise<unknown> {
    const res = await apiClient.patch(`document-types/${id}/toggle`);
    return res.data.data;
  },

  async getPendingWithdrawals(): Promise<Withdrawal[]> {
    const res = await apiClient.get("withdrawals/admin/pending");
    return res.data.data;
  },

  async approveWithdrawal(id: string, adminNote = ""): Promise<unknown> {
    const res = await apiClient.post(`withdrawals/admin/approve/${id}`, { adminNote });
    return res.data;
  },

  async rejectWithdrawal(id: string, adminNote = ""): Promise<unknown> {
    const res = await apiClient.post(`withdrawals/admin/reject/${id}`, { adminNote });
    return res.data;
  },

  async getAllSettings(): Promise<Record<string, string>> {
    const res = await apiClient.get("settings");
    return res.data.data;
  },

  async updateSetting(key: string, value: string): Promise<unknown> {
    const res = await apiClient.post(`settings/${key}`, { value });
    return res.data;
  },

  async getAdminUsers(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<{ users: AdminUser[]; total: number }> {
    const res = await apiClient.get("auth/admin/users", { params });
    return res.data;
  },

  async deleteUser(id: string): Promise<unknown> {
    const res = await apiClient.delete(`auth/admin/users/${id}`);
    return res.data;
  },

  async getAllReferrals(): Promise<Referral[]> {
    const res = await apiClient.get("referrals/admin");
    return res.data.data;
  },

  async rewardReferral(id: string): Promise<unknown> {
    const res = await apiClient.patch(`referrals/admin/${id}/reward`);
    return res.data;
  },

  async getAllTransactions(): Promise<Transaction[]> {
    const res = await apiClient.get("payments/admin/all");
    return res.data.transactions;
  },

  async getRecentMatches(): Promise<RecentMatch[]> {
    const res = await apiClient.get("admin/matching/recent");
    return res.data?.data ?? [];
  },

  async getMatchingStats(): Promise<MatchingStats> {
    const res = await apiClient.get("admin/matching/stats");
    return res.data?.data ?? { totalMatches: 0, highConfidence: 0, potential: 0, averageScore: 0 };
  },

  // ── Autorités ──
  async getAutorites(filters?: { niveau?: string; ville?: string; is_active?: boolean }): Promise<Autorite[]> {
    const res = await apiClient.get("autorites", { params: filters });
    return res.data.data ?? [];
  },

  async createAutorite(data: Partial<Autorite>): Promise<Autorite> {
    const res = await apiClient.post("autorites", data);
    return res.data.data;
  },

  async updateAutorite(id: string, data: Partial<Autorite>): Promise<Autorite> {
    const res = await apiClient.put(`autorites/${id}`, data);
    return res.data.data;
  },

  async deleteAutorite(id: string): Promise<unknown> {
    const res = await apiClient.delete(`autorites/${id}`);
    return res.data;
  },

  // ── Partenaires ──
  async getPartenaires(filters?: { search?: string; statut?: string; page?: number; limit?: number }): Promise<{ rows: Partenaire[]; total: number }> {
    const res = await apiClient.get("partenaires", { params: filters });
    return { rows: res.data?.rows ?? [], total: res.data?.total ?? 0 };
  },

  async createPartenaire(data: Partial<Partenaire>): Promise<Partenaire> {
    const res = await apiClient.post("partenaires", data);
    return res.data.data;
  },

  async updatePartenaire(id: string, data: Partial<Partenaire>): Promise<Partenaire> {
    const res = await apiClient.put(`partenaires/${id}`, data);
    return res.data.data;
  },

  async adjustPartenaireWallet(id: string, data: { type: "CREDIT" | "DEBIT"; amount: number; motif?: string }): Promise<{ balance: number }> {
    const res = await apiClient.post(`partenaires/${id}/wallet`, data);
    return res.data.data;
  },

  async getPartenaireWalletHistory(id: string, params?: { limit?: number; offset?: number }): Promise<{ balance: number; history: PartenaireWalletTransaction[] }> {
    const res = await apiClient.get(`partenaires/${id}/wallet`, { params });
    return { balance: res.data?.data?.balance ?? 0, history: res.data?.data?.history ?? [] };
  },

  async deletePartenaire(id: string): Promise<unknown> {
    const res = await apiClient.delete(`partenaires/${id}`);
    return res.data;
  },

  async getSharePayBalance(): Promise<{ balance: number; currency: string }> {
    const res = await apiClient.get("admin/sharepay-balance");
    return res.data.data;
  },

};
