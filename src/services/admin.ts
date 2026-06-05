import apiClient from "./api";

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

  async createPlan(data: Partial<Plan>): Promise<unknown> {
    const res = await apiClient.post("plans", data);
    return res.data.data;
  },

  async getFeatureDefinitions(): Promise<FeatureDefinition[]> {
    return [
      { code: "max_documents", label: "Documents", type: "number", description: "Max documents" },
      { code: "max_devices", label: "Appareils", type: "number", description: "Max appareils" },
      { code: "has_analytics", label: "Analytiques", type: "boolean", description: "Accès aux statistiques" },
      { code: "has_priority_support", label: "Support prioritaire", type: "boolean", description: "Assistance prioritaire" },
      { code: "has_api_access", label: "API Access", type: "boolean", description: "Accès API" },
    ];
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

  async getAdminUsers(): Promise<{ users: AdminUser[] }> {
    const res = await apiClient.get("auth/admin/users");
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

};
