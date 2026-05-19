/**
 * ═════════════════════════════════════════════════════════════════
 * API.JS - Central API Service Layer
 * Exports all core API calls to backend endpoints
 * ═════════════════════════════════════════════════════════════════
 */

import apiClient, { setAuthToken, clearAuthToken } from '../core/axios.js';
import { getToken } from '../utils/cookie.js';

// Dynamic API base URL based on environment configuration
const getApiBaseUrl = () => {
  // Priority 1: Use explicit environment variable (from .env or .env.production)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Priority 2: Fallback to runtime detection (for backward compatibility)
  const origin = window.location.origin; // Ex: http://217.154.126.24:3003
  
  // Si on est sur localhost ou 127.0.0.1 → backend local
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'http://localhost:5000/api';
  }
  
  // Production: remplacer le port 3003 par 5000
  // http://217.154.126.24:3003 → http://217.154.126.24:5000/api
  const backendUrl = origin.replace(':3003', ':5000');
  return `${backendUrl}/api`;
};

export const API_BASE_URL = getApiBaseUrl();
export const BASE_URL = window.location.origin;
export const api = apiClient;

// Debug: Log API configuration
if (typeof console !== 'undefined') {
  console.log('[API Config]', {
    apiBaseUrl: API_BASE_URL,
    frontendOrigin: window.location.origin
  });
}

/**
 * Helper to get authentication headers for fetch calls
 */
export function getAuthHeaders() {
  const token = getToken();
  return {
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

/**
 * ────────────────────────────────────────────────────────────────
 * AUTHENTICATION ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Register a new user
 * @param {Object} userData - User registration data
 */
export async function registerUser(userData) {
  try {
    const response = await apiClient.post('auth/register', {
      nom: userData.nom,
      prenom: userData.prenom,
      email: userData.email,
      mot_de_passe: userData.mot_de_passe,
      telephone: userData.telephone || null,
      pays: userData.pays || 'Cameroun',
      ville: userData.ville || 'Yaoundé',
      code_parrainage: userData.code_parrainage || null,
      is_verified: userData.is_verified || false
    });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de l\'inscription.';
    return { success: false, message };
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(email, mot_de_passe) {
  try {
    const response = await apiClient.post('auth/login', {
      email,
      mot_de_passe,
    });
    
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de la connexion.';
    return { success: false, message };
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email) {
  try {
    const response = await apiClient.post('auth/forgot-password', { email });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de la demande de réinitialisation.';
    return { success: false, message };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(token, newPassword) {
  try {
    const response = await apiClient.post('auth/reset-password', {
      token,
      newPassword,
    });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de la réinitialisation.';
    return { success: false, message };
  }
}

/**
 * Send verification PIN to email or SMS
 */
export async function apiSendVerificationPin(email, telephone = null) {
  try {
    const response = await apiClient.post('auth/send-verification-pin', { email, telephone });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de l\'envoi du code.';
    return { success: false, message };
  }
}

/**
 * Verify email PIN
 */
export async function apiVerifyEmailPin(email, pin) {
  try {
    const response = await apiClient.post('auth/verify-email-pin', { email, pin });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.error || 'Code de vérification invalide.';
    return { success: false, message };
  }
}

/**
 * Logout user
 */
export async function logout() {
  try {
    await apiClient.post('auth/logout');
  } catch (e) {
    console.error('Erreur lors de la déconnexion backend:', e);
  }
  clearAuthToken();
  localStorage.removeItem('docmaster_user_session');
  window.location.href = '/login.html';
}

/**
 * Login/Register with Google OAuth
 * @param {string} firebaseToken - Firebase ID token from Google sign-in
 * @param {Object} userInfo - User info from Firebase (email, displayName, photoURL)
 */
export async function googleOAuthLogin(firebaseToken, userInfo) {
  try {
    const response = await apiClient.post('auth/google-oauth', {
      token: firebaseToken,
      email: userInfo.email,
      displayName: userInfo.displayName || '',
      photoURL: userInfo.photoURL || '',
    });
    
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de la connexion Google.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * REFERRAL ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Get current user referrals
 */
export async function getMyReferrals() {
  try {
    const response = await apiClient.get('referrals');
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de la récupération des parrainages.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * USER PROFILE ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Get current user profile
 */
export async function getProfile() {
  try {
    const response = await apiClient.get('auth/profile');
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.error || 'Erreur lors de la récupération du profil.';
    return { success: false, message };
  }
}

/**
 * Get current user earnings and points breakdown
 */
export async function getUserEarningsStats() {
  try {
    const response = await apiClient.get('auth/earnings-stats');
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des gains.';
    return { success: false, message };
  }
}

/**
 * Update user profile
 * @param {Object} userData - Profile data { nom, prenom, telephone, photo_profile: File }
 */
export async function updateProfile(userData) {
  console.log('🚀 [API] Mise à jour du profil avec:', userData);

  try {
    const formData = new FormData();
    
    // If it's already a FormData, we use it directly
    if (userData instanceof FormData) {
      const response = await apiClient.put('auth/profile', userData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return { success: true, data: response.data };
    }

    // Otherwise, build it from object
    for (const key in userData) {
      if (userData[key] !== null && userData[key] !== undefined) {
        formData.append(key, userData[key]);
        console.log(`📝 Ajouté ${key}:`, userData[key]);
      }
    }

    const response = await apiClient.put('auth/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('✅ [API] Profil mis à jour avec succès:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ [API] Erreur lors de la mise à jour du profil:', error);
    const message = error.response?.data?.error || 'Erreur lors de la mise à jour du profil.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * DOCUMENT ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Register a user's own document
 * @param {Object} docData - Document data
 */
export async function registerMyDocument(docData) {
  console.log('🚀 [API] Enregistrement d\'un document avec:', docData);

  try {
    const formData = new FormData();
    
    // If it's already a FormData, we use it directly
    if (docData instanceof FormData) {
      const response = await apiClient.post('documents', docData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return { success: true, data: response.data };
    }

    // Otherwise, build it from object
    for (const key in docData) {
      if (docData[key] !== null && docData[key] !== undefined) {
        formData.append(key, docData[key]);
        console.log(`📝 Ajouté ${key}:`, docData[key]);
      }
    }

    const response = await apiClient.post('documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('✅ [API] Document enregistré avec succès:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ [API] Erreur lors de l\'enregistrement:', error);
    const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement du document.';
    return { success: false, message };
  }
}

/**
 * Get list of user's documents
 */
export async function getMyDocuments() {
  try {
    const response = await apiClient.get('documents');
    return { 
      success: true, 
      data: response.data.data, 
      count: response.data.count || response.data.data.length 
    };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des documents.';
    return { success: false, message };
  }
}

/**
 * Delete a document
 * @param {string} id - Document ID
 */
export async function deleteDocument(id) {
  try {
    const response = await apiClient.delete(`documents/${id}`);
    return { success: true, message: response.data.message };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la suppression.';
    return { success: false, message };
  }
}

/**
 * Declare a personal document as lost
 */
export async function reportDocumentLost(id, password) {
  try {
    const response = await apiClient.patch(`documents/${id}/lost`, { password });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la déclaration de perte.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * DOCUMENT SHARING ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Create a shareable link for a document
 */
export async function shareDocument(documentId, daysValid = null) {
  try {
    const response = await apiClient.post(`shares/${documentId}`, { daysValid });
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la création du lien de partage.';
    return { success: false, message };
  }
}

/**
 * Get shared document info (Public)
 */
export async function getSharedDocument(token) {
  try {
    const response = await apiClient.get(`shares/public/${token}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Lien invalide ou expiré.';
    return { success: false, message };
  }
}

/**
 * Get all shares for a document
 */
export async function getDocumentShares(documentId) {
  try {
    const response = await apiClient.get(`shares/${documentId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return { success: false, message: 'Erreur lors de la récupération des partages.' };
  }
}

/**
 * Revoke a share link
 */
export async function revokeShare(shareId) {
  try {
    const response = await apiClient.delete(`shares/${shareId}`);
    return { success: true, message: response.data.message };
  } catch (error) {
    return { success: false, message: 'Erreur lors de la révocation.' };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * DEVICE ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Register a new device
 * @param {Object|FormData} deviceData - Device data
 */
export async function registerMyDevice(deviceData) {
  try {
    const response = await apiClient.post('devices', deviceData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement de l\'appareil.';
    return { success: false, message };
  }
}

/**
 * Get list of user's devices
 */
export async function getMyDevices() {
  try {
    const response = await apiClient.get('devices');
    return { 
      success: true, 
      data: response.data.data, 
      count: response.data.count || response.data.data.length 
    };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des appareils.';
    return { success: false, message };
  }
}

/**
 * Declare a device as lost
 */
export async function reportDeviceLost(id, password, status = 'LOST') {
  try {
    const response = await apiClient.patch(`devices/${id}/lost`, { password, status });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la déclaration de perte.';
    return { success: false, message };
  }
}

/**
 * Declare a device as found
 */
export async function reportDeviceFound(id, password) {
  try {
    const response = await apiClient.patch(`devices/${id}/found`, { password });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la mise à jour du statut.';
    return { success: false, message };
  }
}

/**
 * Verify a device by IMEI or Serial Number
 */
export async function verifyDevice(identifier) {
  try {
    const response = await apiClient.get(`devices/verify/${identifier}`);
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la vérification de l\'appareil.';
    return { success: false, message };
  }
}

/**
 * Delete a device
 */
export async function deleteDevice(id) {
  try {
    const response = await apiClient.delete(`devices/${id}`);
    return { success: true, message: response.data.message };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la suppression.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * DECLARATIONS ENDPOINTS (Lost/Found)
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Create a new lost declaration
 * @param {FormData} formData - Declaration data with photos
 */
export async function createLostDeclaration(formData) {
  try {
    const response = await apiClient.post('declarations/lost', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la déclaration de perte.';
    const errors = error.response?.data?.errors || {};
    return { success: false, message, errors };
  }
}

/**
 * Create a new found declaration
 * @param {FormData} formData - Declaration data with photos
 */
export async function createFoundDeclaration(formData) {
  try {
    const response = await apiClient.post('declarations/found', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la déclaration de trouvaille.';
    const errors = error.response?.data?.errors || {};
    return { success: false, message, errors };
  }
}

/**
 * Get current user's declarations
 */
export async function getMyDeclarations() {
  try {
    const response = await apiClient.get('declarations/me');
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des déclarations.';
    return { success: false, message };
  }
}

/**
 * Get a specific declaration by ID
 */
export async function getDeclarationById(id) {
  try {
    const response = await apiClient.get(`declarations/${id}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération du détail.';
    return { success: false, message };
  }
}

/**
 * Get global DocMaster statistics
 */
export async function getGlobalStats() {
  try {
    const response = await apiClient.get('declarations/stats');
    return { success: true, data: response.data.data };
  } catch (error) {
    return { success: false, message: 'Erreur lors de la récupération des statistiques.' };
  }
}

/**
 * Get DocMaster performance stats by document type with trends
 * @param {string} period - 'day', 'week', 'month', 'year'
 */
export async function getPerformanceStats(period = 'month') {
  try {
    const response = await apiClient.get(`declarations/performance?period=${period}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return { success: false, message: 'Erreur lors de la récupération des statistiques de performance.' };
  }
}

/**
 * Get active document types for declarations
 */
export async function getActiveDocumentTypes() {
  try {
    const response = await apiClient.get('document-types/active');
    // Ensure we always return an array
    let data = response.data;
    if (data && data.data && Array.isArray(data.data)) {
      data = data.data;
    }
    if (!Array.isArray(data)) {
      data = [];
    }
    return { success: true, data };
  } catch (error) {
    console.error('Erreur getActiveDocumentTypes:', error);
    return { success: false, message: 'Impossible de charger les types de documents.', data: [] };
  }
}

/**
 * Public fuzzy search for found documents
 */
export async function searchPublicFound(query) {
  try {
    const response = await apiClient.get(`declarations/search-public?q=${encodeURIComponent(query)}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return { success: false, message: 'Erreur lors de la recherche.' };
  }
}

/**
 * Initiate recovery process for a found document
 * @param {string} docId - Document ID
 */
export async function initiateRecovery(docId) {
  try {
    const response = await apiClient.post(`declarations/${docId}/initiate-recovery`);
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de l\'initialisation de la récupération.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * NOTIFICATION ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Get all notifications for the user
 */
export async function getMyNotifications() {
  try {
    const response = await apiClient.get('notifications');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, message: 'Erreur lors de la récupération des notifications.' };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(id) {
  try {
    const response = await apiClient.patch(`notifications/${id}/read`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, message: 'Erreur lors de la mise à jour de la notification.' };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  try {
    const response = await apiClient.patch('notifications/read-all');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, message: 'Erreur lors de la mise à jour des notifications.' };
  }
}



/**
 * ────────────────────────────────────────────────────────────────
 * CLAIM ENDPOINTS (Document Recovery)
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Create a new claim manually
 * @param {Object} claimData - Claim data { docId, ownerId, finderId }
 */
export async function createClaim(claimData) {
  try {
    const response = await apiClient.post('claims/create', claimData);
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la création du claim.';
    return { success: false, message };
  }
}

/**
 * Get active claim for a document
 * @param {string} docId - Document ID
 */
export async function getActiveClaim(docId) {
  try {
    const response = await apiClient.get(`claims/active/${docId}`);
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération du claim.';
    return { success: false, message };
  }
}

/**
 * Validate recovery code for a document
 * @param {Object} validationData - { docId, code }
 */
export async function validateRecoveryCode(validationData) {
  try {
    const response = await apiClient.post('claims/validate', validationData);
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Code de validation invalide.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * PAYMENT ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Pay recovery fee for document
 * @param {Object} paymentData - { docId, amount, paymentMethod }
 */
export async function payRecoveryFee(paymentData) {
  try {
    const response = await apiClient.post('payments/pay-recovery', paymentData);
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors du paiement.';
    return { success: false, message };
  }
}

/**
 * Get transaction history for current user
 */
export async function getMyTransactions() {
  try {
    const response = await apiClient.get('payments/my-history');
    return { success: true, data: response.data.transactions };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des transactions.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * DELETION REQUEST ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Get user's deletion requests
 */
export async function getMyDeletionRequests() {
  try {
    const response = await apiClient.get('deletion-requests/me');
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des demandes de suppression.';
    return { success: false, message };
  }
}

/**
 * Request deletion of a declaration
 * @param {string} declarationId - Declaration ID
 * @param {string} reason - Reason for deletion
 */
export async function requestDeclarationDeletion(declarationId, reason) {
  try {
    const response = await apiClient.post(`deletion-requests/declarations/${declarationId}/request-deletion`, { reason });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la demande de suppression.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * ADMIN ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Get admin statistics (admin only)
 */
export async function getAdminStats() {
  try {
    const response = await apiClient.get('subscriptions/admin/stats');
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des statistiques admin.';
    return { success: false, message };
  }
}

/**
 * Get all subscriptions (admin only)
 */
export async function getAllSubscriptions() {
  try {
    const response = await apiClient.get('subscriptions/admin/all');
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des abonnements.';
    return { success: false, message };
  }
}

/**
 * Update subscription status (admin only)
 * @param {string} subscriptionId - Subscription ID
 * @param {string} status - New status
 */
export async function updateSubscriptionStatus(subscriptionId, status) {
  try {
    const response = await apiClient.patch(`subscriptions/admin/${subscriptionId}/status`, { status });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la mise à jour du statut.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * SUBSCRIPTION ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Get current user's subscription usage and limits
 */
export async function getUserSubscriptionUsage() {
  try {
    const response = await apiClient.get('subscriptions/usage');
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération de l\'usage.';
    return { success: false, message };
  }
}

/**
 * Get current user's active subscription (Legacy)
 */
export async function getMySubscription() {
  try {
    const response = await apiClient.get('subscriptions/my-subscription');
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération de l\'abonnement.';
    return { success: false, message };
  }
}

/**
 * Subscribe to a plan
 * @param {string} planId - ID of the plan
 * @param {number} months - Duration in months
 * @param {string} paymentMethod - Selected payment method
 * @param {string} phone - Payer phone number
 */
export async function subscribeToPlan(planId, months = 1, paymentMethod = 'MOMO', phone = '') {
  try {
    const response = await apiClient.post('subscriptions/subscribe', { planId, months, paymentMethod, phone });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la souscription.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * PLAN ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Get all available plans
 */
export async function getAllPlans() {
  try {
    const response = await apiClient.get('plans');
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des plans.';
    return { success: false, message };
  }
}

/**
 * Get plan by ID (admin only)
 * @param {string} planId - Plan ID
 */
export async function getPlanById(planId) {
  try {
    const response = await apiClient.get(`plans/${planId}`);
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération du plan.';
    return { success: false, message };
  }
}

/**
 * Get feature definitions (admin only)
 */
export async function getFeatureDefinitions() {
  try {
    const response = await apiClient.get('plans/features/definitions');
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des définitions.';
    return { success: false, message };
  }
}

/**
 * ────────────────────────────────────────────────────────────────
 * TRANSACTION / PAYMENT ENDPOINTS
 * ────────────────────────────────────────────────────────────────
 */

/**
 * Get transaction history for current user
 */
export async function getTransactionHistory() {
  try {
    const response = await apiClient.get('payments/my-history');
    return { success: true, data: response.data.transactions };
  } catch (error) {
    return { success: false, message };
  }
}

/**
 * Get application settings
 */
export async function getSettings() {
  try {
    const response = await apiClient.get('settings');
    return { success: true, data: response.data.data };
  } catch (error) {
    return { success: false, message: 'Erreur lors de la récupération des paramètres.' };
  }
}
/**
 * Get SMS Balance (admin only)
 */
export async function apiGetSmsBalance() {
  try {
    const response = await apiClient.get('sms/balance');
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération du solde SMS.';
    return { success: false, message };
  }
}

/**
 * Get SMS Usage Statistics (admin only)
 */
export async function apiGetSmsUsage() {
  try {
    const response = await apiClient.get('sms/usage');
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération des statistiques SMS.';
    return { success: false, message };
  }
}

/**
 * Get SMS Purchase History (admin only)
 */
export async function apiGetSmsPurchaseHistory() {
  try {
    const response = await apiClient.get('sms/purchase-history');
    return { success: true, data: response.data.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Erreur lors de la récupération de l\'historique SMS.';
    return { success: false, message };
  }
}
