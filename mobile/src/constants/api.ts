export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api-v2.docmaster.net/api';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:4000';
export const QUERY_KEYS = {
  DOCUMENTS: 'documents',
  DOCUMENT: 'document',
  USER: 'user',
} as const;
