/**
 * ═════════════════════════════════════════════════════════════════
 * AXIOS.JS - HTTP Client Configuration
 * Configures axios instance with base URL and JWT token headers
 * ═════════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { getToken, saveToken, deleteToken } from '../utils/cookie.js';

const API_BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || '/api/';
const AUTH_TOKEN_KEY = 'docmaster_jwt_token';

/**
 * Create axios instance with base URL
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // IMPORTANT: Allows sending and receiving cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add JWT token to headers (kept as backup for old systems)
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle auth errors and token expiry
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If 401, token expired - clear localStorage and cookies and redirect to login
    if (error.response?.status === 401) {
      deleteToken();
      localStorage.removeItem('docmaster_user_session');
      
      const isLoginPage = window.location.pathname.endsWith('/login.html') || 
                          window.location.pathname === '/';
                          
      if (!isLoginPage) {
        window.location.href = '/login.html';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Save JWT token to localStorage and cookies
 */
export function setAuthToken(token) {
  saveToken(token);
}

/**
 * Get JWT token from localStorage or cookies
 */
export function getAuthToken() {
  return getToken();
}

/**
 * Clear JWT token from localStorage and cookies
 */
export function clearAuthToken() {
  deleteToken();
}

/**
 * Get axios instance for manual requests
 */
export default apiClient;
