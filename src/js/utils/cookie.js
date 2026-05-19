/**
 * COOKIE.JS - Utilitaires pour gérer les cookies et tokens JWT
 */

const TOKEN_KEY = 'docmaster_jwt_token';

/**
 * Récupère un cookie par son nom
 */
export function getCookie(name) {
  const nameEQ = name + "=";
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(nameEQ)) {
      return cookie.substring(nameEQ.length);
    }
  }
  return null;
}

/**
 * Définit un cookie
 */
export function setCookie(name, value, options = {}) {
  const defaults = {
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 jours par défaut
    ...options
  };

  let cookieString = `${name}=${encodeURIComponent(value)}`;
  
  if (defaults.path) {
    cookieString += `; path=${defaults.path}`;
  }
  
  if (defaults.maxAge) {
    cookieString += `; max-age=${defaults.maxAge}`;
  }
  
  if (defaults.secure) {
    cookieString += '; secure';
  }
  
  if (defaults.sameSite) {
    cookieString += `; samesite=${defaults.sameSite}`;
  }

  document.cookie = cookieString;
}

/**
 * Token Management Functions
 */

export function getToken() {
  // Try localStorage first
  let token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  
  // Fallback to cookie
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === TOKEN_KEY) {
      token = decodeURIComponent(value);
      // Sync to localStorage
      if (token) localStorage.setItem(TOKEN_KEY, token);
      return token;
    }
  }
  return null;
}

export function saveToken(token) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  // Also set as cookie for server-side access
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Lax`;
}

export function deleteToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function isAuthenticated() {
  return !!getToken();
}
