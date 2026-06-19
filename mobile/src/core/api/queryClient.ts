import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { Platform } from 'react-native';

// Configure online manager to use NetInfo
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1, // 1 minute
      // Keep the in-memory cache for 30 minutes. Persisted snapshots follow the
      // same window below so AsyncStorage does not accumulate multi-MB
      // payloads across sessions (the AsyncStorage Android backend refuses to
      // return a single value larger than ~2 MB — see "Row too big to fit
      // into CursorWindow").
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
    },
  },
});

// Persistence configuration
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'DOCMASTER_OFFLINE_CACHE',
  throttleTime: 1000,
});

// Safely initialize persistence. The AsyncStorage Android backend stores
// values in a SQLite row capped at ~2 MB; if a previously cached payload
// grew past that limit, `multiGet` throws on the next cold start with
// "Row too big to fit into CursorWindow" and the app cannot hydrate. The
// read happens inside `persistQueryClient`'s microtask — a single outer
// try/catch cannot catch it, so we wrap the persister's read/write in
// safe fallbacks that drop the key on failure. On boot we also
// defensively remove any existing oversized key before
// persistQueryClient tries to read it.
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  const MAX_CACHE_BYTES = 1024 * 1024; // 1 MB — well below the 2 MB row cap

  (async () => {
    try {
      // Pre-flight: drop the key if it has already grown too big on a
      // previous install. This unblocks devices that crashed at boot.
      try {
        const raw = await AsyncStorage.getItem('DOCMASTER_OFFLINE_CACHE');
        if (raw && raw.length > MAX_CACHE_BYTES) {
          await AsyncStorage.removeItem('DOCMASTER_OFFLINE_CACHE');
          console.warn(
            `[queryClient] Cleared oversized offline cache (${(raw.length / 1024).toFixed(0)} KB)`,
          );
        }
      } catch {}

      const safePersister = {
        ...asyncStoragePersister,
        // Wrap persist: a write failure (e.g. quota / native crash on a
        // payload that just crossed the cap) must not bring the app down —
        // clear the key and let the next mutation re-create it.
        persistClient: async (...args: Parameters<typeof asyncStoragePersister.persistClient>) => {
          try {
            // The underlying persister is throttled and returns void; we
            // do the same to keep the contract.
            await asyncStoragePersister.persistClient(...args);
          } catch (error) {
            console.warn('[queryClient] Failed to persist client snapshot:', error);
            try {
              await AsyncStorage.removeItem('DOCMASTER_OFFLINE_CACHE');
            } catch {}
          }
        },
        // Wrap restore: this is where the CursorWindow crash actually
        // surfaces. Catch it, drop the corrupted key, and continue with
        // an empty cache.
        restoreClient: async () => {
          try {
            return await asyncStoragePersister.restoreClient();
          } catch (error) {
            console.warn(
              '[queryClient] Failed to restore offline cache — clearing:',
              error,
            );
            try {
              await AsyncStorage.removeItem('DOCMASTER_OFFLINE_CACHE');
            } catch {}
            return undefined;
          }
        },
      };

      persistQueryClient({
        queryClient,
        persister: safePersister,
        maxAge: 1000 * 60 * 30, // 30 minutes — matches gcTime above
      });
    } catch (error) {
      console.warn('Failed to initialize persistQueryClient:', error);
    }
  })();
}
