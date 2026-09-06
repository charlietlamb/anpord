/** The delay between a promotion and callers seeing it, so it stays short. */
const TTL_MS = 15_000;

/** Only bounds staleness while the API answers; an unreachable API has no
 * bound, since a day-old real prompt beats no prompt. */
const MAX_STALE_MS = 24 * 60 * 60 * 1000;

const CAPACITY = 1000;

/** A cold cache going stale at once must not fork a refresh per prompt. */
const MAX_CONCURRENT_REFRESH = 8;

export interface CacheOptions {
  readonly capacity?: number;
  readonly maxConcurrentRefresh?: number;
  readonly maxStaleMs?: number;
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
    capacity: positive(given.capacity, CAPACITY),
    maxConcurrentRefresh: positive(
      given.maxConcurrentRefresh,
      MAX_CONCURRENT_REFRESH
    ),
    maxStaleMs: positive(given.maxStaleMs, MAX_STALE_MS),
    ttlMs: positive(given.ttlMs, TTL_MS),
  };
};

export const cacheEnabled = (options: CacheOptions | boolean | undefined) =>
  options !== false;
