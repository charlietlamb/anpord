const TTL_MS = 15_000;

const MAX_STALE_MS = 24 * 60 * 60 * 1000;

const CAPACITY = 1000;

const MAX_CONCURRENT_REFRESH = 8;

export interface CacheOptions {
  readonly ttlMs?: number;
}

export interface CacheSettings {
  readonly capacity: number;
  readonly maxConcurrentRefresh: number;
  readonly maxStaleMs: number;
  readonly ttlMs: number;
}

const positive = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;

export const settingsFrom = (
  options: CacheOptions | boolean | undefined
): CacheSettings => {
  const given = typeof options === "object" ? options : {};

  return {
    capacity: CAPACITY,
    maxConcurrentRefresh: MAX_CONCURRENT_REFRESH,
    maxStaleMs: MAX_STALE_MS,
    ttlMs: positive(given.ttlMs, TTL_MS),
  };
};

export const cacheEnabled = (options: CacheOptions | boolean | undefined) =>
  options !== false;
