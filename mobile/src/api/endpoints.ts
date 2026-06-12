/** Centralized endpoint paths (relative to API_BASE_URL). */
export const endpoints = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    profile: "/auth/profile",
    refresh: "/auth/refresh",
  },
  documents: {
    list: "/documents",
    create: "/documents",
    byId: (id: string) => `/documents/${id}`,
  },
} as const;

/** React Query cache keys. Keep stable and serializable. */
export const queryKeys = {
  profile: ["profile"] as const,
  documents: ["documents"] as const,
  document: (id: string) => ["documents", id] as const,
};
