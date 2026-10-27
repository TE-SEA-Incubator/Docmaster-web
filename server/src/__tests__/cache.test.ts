import { beforeAll, describe, expect, it, vi } from "vitest";

type CacheModule = typeof import("../cache/cache.ts");
type KeysModule = typeof import("../cache/keys.ts");

let cache: CacheModule;
let keys: KeysModule;

describe("cache", () => {
  beforeAll(async () => {
    process.env.REDIS_URL = "";
    process.env.CACHE_ENABLED = "true";
    process.env.CACHE_DEBUG = "false";
    cache = await import("../cache/cache.ts");
    keys = await import("../cache/keys.ts");
  });

  it("returns the cached value without calling the loader twice", async () => {
    const loader = vi.fn(async () => ({ value: 42 }));
    const key = `test:${Date.now()}:basic`;

    const first = await cache.getOrSet(key, 60, loader);
    const second = await cache.getOrSet(key, 60, loader);

    expect(first).toEqual({ value: 42 });
    expect(second).toEqual({ value: 42 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("expires entries after the TTL", async () => {
    vi.useFakeTimers();
    try {
      const key = `test:${Date.now()}:ttl`;
      const loader = vi.fn()
        .mockResolvedValueOnce("first")
        .mockResolvedValueOnce("second");

      expect(await cache.getOrSet(key, 1, loader)).toBe("first");
      vi.advanceTimersByTime(1_001);
      expect(await cache.getOrSet(key, 1, loader)).toBe("second");
      expect(loader).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("changes versioned keys after a version bump", async () => {
    const query = `version-test-${Date.now()}`;
    const before = await keys.buildPublicSearchCacheKey(query);

    await cache.bumpCacheVersion(keys.PUBLIC_SEARCH_VERSION);
    const after = await keys.buildPublicSearchCacheKey(query);

    expect(after).not.toBe(before);
  });

  it("normalizes the empty query to a single cache key", async () => {
    const first = await keys.buildPublicSearchCacheKey("   ");
    const second = await keys.buildPublicSearchCacheKey(undefined);

    expect(first).toBe(second);
    expect(first.endsWith(":__all__")).toBe(true);
  });
});
