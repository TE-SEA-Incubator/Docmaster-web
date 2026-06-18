import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { type PersistQueryClientOptions } from "@tanstack/react-query-persist-client";

/**
 * QueryClient tuned for an offline-first mobile app:
 *  - Long `gcTime` so cached data survives while the app is backgrounded.
 *  - `networkMode: "offlineFirst"` so reads serve cache instantly and
 *    writes are attempted then paused (queued) when offline.
 *  - Retries with backoff for transient failures.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      staleTime: 1000 * 60, // 1 min: data is "fresh" enough to skip refetch.
      gcTime: 1000 * 60 * 60 * 24, // 24h: keep cache for offline access.
      retry: 2,
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: 1,
    },
  },
});

/**
 * Persists the whole React Query cache to AsyncStorage so that data
 * (and paused mutations) survive cold starts — the backbone of the
 * offline-first cache layer.
 */
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "docmaster.react-query-cache.v1",
  throttleTime: 1000,
});

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};
