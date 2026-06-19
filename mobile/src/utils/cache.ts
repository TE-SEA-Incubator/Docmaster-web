import AsyncStorage from '@react-native-async-storage/async-storage';

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const DEFAULT_TTL = 1000 * 60 * 60 * 24; // 24 hours

export const cache = {
  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now() + ttl,
    };
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  },

  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    if (!raw) return null;

    try {
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.timestamp) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }
      return entry.data;
    } catch (e) {
      await AsyncStorage.removeItem(`cache_${key}`);
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(`cache_${key}`);
  },

  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  }
};
