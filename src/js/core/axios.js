/**
 * ═════════════════════════════════════════════════════════════════
 * AXIOS.JS - HTTP Client Configuration
 * Configures axios instance with base URL and JWT token headers
 * ═════════════════════════════════════════════════════════════════
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/';
const AUTH_TOKEN_KEY = 'docmaster_jwt_token';

/**
 * Create axios instance with base URL
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add JWT token to headers
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
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
    // If 401, token expired - clear localStorage and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
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
 * Save JWT token to localStorage
 */
export function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Get JWT token from localStorage
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Clear JWT token from localStorage
 */
export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Get axios instance for manual requests
 */
export default apiClient;
