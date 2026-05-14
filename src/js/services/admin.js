/**
 * Admin API Service for DocMaster
 */
import { API_BASE_URL, getAuthHeaders } from "./api.js";

export const adminService = {
  /**
   * Get subscription statistics for dashboard
   */
  async getDashboardStats() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/subscriptions/admin/stats`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des stats");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Admin Stats Error:", error);
      throw error;
    }
  },

  /**
   * Get all subscriptions for management list
   */
  async getAllSubscriptions() {
    try {
      const response = await fetch(`${API_BASE_URL}/subscriptions/admin/all`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des abonnements");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Admin Subscriptions Error:", error);
      throw error;
    }
  },

  /**
   * Update a subscription status
   */
  async updateSubscriptionStatus(id, status) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/subscriptions/admin/${id}/status`,
        {
          method: "PATCH",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );
      if (!response.ok)
        throw new Error("Erreur lors de la mise à jour du statut");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Update Status Error:", error);
      throw error;
    }
  },

  /**
   * Get all plans for administration
   */
  async getPlans() {
    try {
      const response = await fetch(`${API_BASE_URL}/plans`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des plans");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Admin Plans Error:", error);
      throw error;
    }
  },

  /**
   * Update a plan configuration
   */
  async updatePlan(id, data) {
    try {
      const response = await fetch(`${API_BASE_URL}/plans/${id}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la mise à jour du plan");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Update Plan Error:", error);
      throw error;
    }
  },

  /**
   * Create a new plan
   */
  async createPlan(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/plans`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erreur lors de la création du plan");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Create Plan Error:", error);
      throw error;
    }
  },

  /**
   * Get all available feature definitions
   */
  async getFeatureDefinitions() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/plans/features/definitions`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des définitions");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Get Definitions Error:", error);
      throw error;
    }
  },

  /**
   * Get all referrals for administration
   */
  async getAllReferrals() {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/admin`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des parrainages");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Admin Referrals Error:", error);
      throw error;
    }
  },

  /**
   * Get all transactions for administration
   */
  async getAllTransactions() {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/admin/all`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des transactions");
      const result = await response.json();
      return result.transactions;
    } catch (error) {
      console.error("Admin Transactions Error:", error);
      throw error;
    }
  },
  /**
   * Reward a referral manually
   */
  async rewardReferral(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/admin/${id}/reward`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("Erreur lors de l'attribution de la récompense");
      return await response.json();
    } catch (error) {
      console.error("Reward Referral Error:", error);
      throw error;
    }
  },

  /**
   * Get all document types for administration
   */
  async getDocumentTypes() {
    try {
      const response = await fetch(`${API_BASE_URL}/document-types`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des types de documents");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Admin Document Types Error:", error);
      throw error;
    }
  },

  /**
   * Create a new document type
   */
  async createDocumentType(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/document-types`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la création du type de document");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Create Document Type Error:", error);
      throw error;
    }
  },

  /**
   * Update a document type
   */
  async updateDocumentType(id, data) {
    try {
      const response = await fetch(`${API_BASE_URL}/document-types/${id}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la mise à jour du type de document");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Update Document Type Error:", error);
      throw error;
    }
  },

  /**
   * Toggle active status of a document type
   */
  async toggleDocumentType(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/document-types/${id}/toggle`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("Erreur lors du changement de statut");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Toggle Document Type Error:", error);
      throw error;
    }
  },

  /**
   * Get all pending withdrawals
   */
  async getPendingWithdrawals() {
    try {
      const response = await fetch(`${API_BASE_URL}/withdrawals/admin/pending`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des retraits");
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Admin Withdrawals Error:", error);
      throw error;
    }
  },

  /**
   * Approve a withdrawal
   */
  async approveWithdrawal(id, adminNote = "") {
    try {
      const response = await fetch(`${API_BASE_URL}/withdrawals/admin/approve/${id}`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminNote }),
      });
      return await response.json();
    } catch (error) {
      console.error("Approve Withdrawal Error:", error);
      throw error;
    }
  },

  /**
   * Reject a withdrawal
   */
  async rejectWithdrawal(id, adminNote = "") {
    try {
      const response = await fetch(`${API_BASE_URL}/withdrawals/admin/reject/${id}`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminNote }),
      });
      return await response.json();
    } catch (error) {
      console.error("Reject Withdrawal Error:", error);
      throw error;
    }
  },

  /**
   * Get all settings
   */
  async getAllSettings() {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Admin Settings Error:", error);
      throw error;
    }
  },

  /**
   * Update a setting
   */
  async updateSetting(key, value) {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/${key}`, {
        method: "POST", // The backend update uses POST on /:key or similar
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value }),
      });
      return await response.json();
    } catch (error) {
      console.error("Update Setting Error:", error);
      throw error;
    }
  },

  /**
   * Get all users for administration
   */
  async getAdminUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/admin/users`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des utilisateurs");
      return await response.json();
    } catch (error) {
      console.error("Admin Users Error:", error);
      throw error;
    }
  },
};
