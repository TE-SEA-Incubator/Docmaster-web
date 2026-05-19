/**
 * AUTH-GUARD.JS - Protège les pages internes nécessitant une authentification
 */

import { getToken, deleteToken } from './cookie.js';

export function protectPage() {
  const token = getToken();
  
  // Si pas de token, rediriger vers login
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }
  
  // Vérifier si le token est valide (basique check)
  try {
    // Si c'est un JWT, il a 3 parties séparées par des points
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token invalide');
    }
    return true;
  } catch (error) {
    // Nettoyer les deux sources
    deleteToken();
    window.location.href = '/login.html';
    return false;
  }
}

// Pages publiques (n'ont pas besoin de protection)
const PUBLIC_PAGES = [
  '/login.html',
  '/index.html',
  'index.html',
  '/rechercher.html',
  '/'
];

export function isPublicPage() {
  const path = window.location.pathname;
  const filename = path.split('/').pop();
  
  // Pages publiques qui ne nécessitent pas d'authentification
  const publicFiles = ['', 'index.html', 'login.html', 'rechercher.html'];
  
  return publicFiles.some(file => {
    return path === '/' || path.endsWith(file) || filename === file;
  });
}
