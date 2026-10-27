import "dotenv/config";
import { createClient } from "redis";

type CacheRedisClient = ReturnType<typeof createClient>;

type MemoryEntry = {
  value: string;
  expiresAt: number;
  bytes: number;
};

const REDIS_PREFIX = process.env.CACHE_PREFIX || "dm:cache";
const CACHE_ENABLED = process.env.CACHE_ENABLED !== "false";
const REDIS_RETRY_MS = Number(process.env.CACHE_REDIS_RETRY_MS || 30_000);
const MEMORY_MAX_ENTRIES = Number(process.env.CACHE_MEMORY_MAX_ENTRIES || 200);
const MEMORY_MAX_BYTES = Number(process.env.CACHE_MEMORY_MAX_BYTES || 64 * 1024 * 1024);
const MAX_VALUE_BYTES = Number(process.env.CACHE_MAX_VALUE_BYTES || 16 * 1024 * 1024);
const CACHE_DEBUG = process.env.CACHE_DEBUG === "true";

const memoryStore = new Map<string, MemoryEntry>();
const memoryVersions = new Map<string, number>();
const inFlight = new Map<string, Promise<unknown>>();

let memoryBytes = 0;
let redisClient: CacheRedisClient | null = null;
let redisConnection: Promise<CacheRedisClient | null> | null = null;
let redisUnavailableUntil = 0;
let redisWarningLogged = false;

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const cacheTtl = {
  search: positiveInt(process.env.CACHE_SEARCH_TTL, 45),
  documentTypes: positiveInt(process.env.CACHE_DOC_TYPES_TTL, 600),
  stats: positiveInt(process.env.CACHE_STATS_TTL, 60),
  statsPeriod: positiveInt(process.env.CACHE_STATS_PERIOD_TTL, 300),
};

function logDebug(message: string) {
  if (CACHE_DEBUG) console.log(`[cache] ${message}`);
}

function markRedisUnavailable(error: unknown) {
  redisUnavailableUntil = Date.now() + Math.max(5_000, REDIS_RETRY_MS);
  if (!redisWarningLogged) {
    redisWarningLogged = true;
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  [cache] Redis indisponible, fallback mémoire actif: ${message}`);
  }
}

async function getRedis(): Promise<CacheRedisClient | null> {
  if (!CACHE_ENABLED || !process.env.REDIS_URL) return null;
  if (Date.now() < redisUnavailableUntil) return null;
  if (redisClient?.isReady) return redisClient;

  if (!redisConnection) {
    redisConnection = (async () => {
      try {
        const client = createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: positiveInt(process.env.CACHE_REDIS_CONNECT_TIMEOUT_MS, 2_000),
            reconnectStrategy: false,
          },
        });

        client.on("error", (error) => {
          markRedisUnavailable(error);
          if (redisClient === client) redisClient = null;
          try {
            client.destroy();
          } catch {
            // Already closed.
          }
        });

        await client.connect();
        redisClient = client;
        redisWarningLogged = false;
        console.log("🧠 [cache] Redis connecté");
        return client;
      } catch (error) {
        markRedisUnavailable(error);
        try {
          // The client may still be retrying in the background.
          redisConnection = null;
        } catch {
          // Ignore cleanup errors.
        }
        return null;
      } finally {
        redisConnection = null;
      }
    })();
  }

  return redisConnection;
}

function readMemory(key: string): string | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    memoryBytes -= entry.bytes;
    return null;
  }

  // Refresh insertion order so the oldest entries are evicted first (LRU).
  memoryStore.delete(key);
  memoryStore.set(key, entry);
  return entry.value;
}

function writeMemory(key: string, value: string, ttlSeconds: number) {
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > MEMORY_MAX_BYTES) {
    logDebug(`valeur trop volumineuse pour le cache mémoire (${bytes} octets), ignorée`);
    return;
  }

  const existing = memoryStore.get(key);
  if (existing) {
    memoryBytes -= existing.bytes;
    memoryStore.delete(key);
  }

  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
    bytes,
  });
  memoryBytes += bytes;

  while (memoryStore.size > MEMORY_MAX_ENTRIES || memoryBytes > MEMORY_MAX_BYTES) {
    const oldestKey = memoryStore.keys().next().value;
    if (!oldestKey) break;
    const oldest = memoryStore.get(oldestKey);
    if (oldest) memoryBytes -= oldest.bytes;
    memoryStore.delete(oldestKey);
  }
}

async function readRaw(key: string): Promise<string | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      return await redis.get(key);
    } catch (error) {
      markRedisUnavailable(error);
    }
  }
  return readMemory(key);
}

async function writeRaw(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(key, value, { EX: ttlSeconds });
      return;
    } catch (error) {
      markRedisUnavailable(error);
    }
  }
  writeMemory(key, value, ttlSeconds);
}

async function readVersion(name: string): Promise<number> {
  const redis = await getRedis();
  const versionKey = `${REDIS_PREFIX}:version:${name}`;

  if (redis) {
    try {
      const current = await redis.get(versionKey);
      if (current) return Number(current) || 1;

      await redis.set(versionKey, "1", { NX: true });
      const created = await redis.get(versionKey);
      return Number(created) || 1;
    } catch (error) {
      markRedisUnavailable(error);
    }
  }

  return memoryVersions.get(name) || 1;
}

/**
 * Returns the current version for a namespace. Cache keys include this value,
 * so bumping the version invalidates every entry without scanning Redis.
 */
export async function getCacheVersion(name: string): Promise<number> {
  if (!CACHE_ENABLED) return 1;
  return readVersion(name);
}

export async function bumpCacheVersion(name: string): Promise<void> {
  if (!CACHE_ENABLED) return;

  const redis = await getRedis();
  if (redis) {
    try {
      const next = await redis.incr(`${REDIS_PREFIX}:version:${name}`);
      memoryVersions.set(name, Number(next) || 1);
      logDebug(`version ${name} -> ${next}`);
      return;
    } catch (error) {
      markRedisUnavailable(error);
    }
  }

  const next = (memoryVersions.get(name) || 1) + 1;
  memoryVersions.set(name, next);
  logDebug(`version mémoire ${name} -> ${next}`);
}

/**
 * Cache-aside helper with request coalescing. Loader errors are never cached.
 */
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  if (!CACHE_ENABLED) return loader();

  const cached = await readRaw(key);
  if (cached !== null) {
    try {
      logDebug(`HIT ${key}`);
      return JSON.parse(cached) as T;
    } catch {
      logDebug(`valeur corrompue ignorée ${key}`);
    }
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) {
    logDebug(`COALESCED ${key}`);
    return pending;
  }

  const promise = (async () => {
    logDebug(`MISS ${key}`);
    const value = await loader();
    try {
      const payload = JSON.stringify(value);
      if (Buffer.byteLength(payload, "utf8") > MAX_VALUE_BYTES) {
        logDebug(`valeur trop volumineuse pour le cache (${Buffer.byteLength(payload, "utf8")} octets), ignorée`);
      } else {
        await writeRaw(key, payload, ttlSeconds);
      }
    } catch (error) {
      console.warn(`⚠️  [cache] Impossible de sérialiser ${key}:`, error);
    }
    return value;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export async function invalidateCacheKey(key: string): Promise<void> {
  if (!CACHE_ENABLED) return;

  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch (error) {
      markRedisUnavailable(error);
    }
  }
  memoryStore.delete(key);
}

export async function initCache(): Promise<void> {
  if (!CACHE_ENABLED) {
    console.log("🧠 [cache] Désactivé (CACHE_ENABLED=false)");
    return;
  }

  const redis = await getRedis();
  if (!redis) {
    console.log("🧠 [cache] Mode mémoire (Redis indisponible)");
  }
}

export async function closeCache(): Promise<void> {
  const client = redisClient;
  redisClient = null;
  if (!client) return;

  try {
    await client.quit();
  } catch {
    // Best-effort shutdown.
  }
}
