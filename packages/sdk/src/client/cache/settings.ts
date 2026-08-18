/**
 * How long a channel's answer is trusted without asking again.
 *
 * This is the delay between a promotion and callers seeing it, so it is short:
 * the dashboard tells whoever promotes that callers receive the new version
 * immediately, and a minute of drift makes that untrue exactly when someone is
 * rolling back something bad. Serving stale while refreshing means the number
 * costs no latency, only freshness.
 */
const TTL_MS = 15_000;

/** Long enough to cover a deploy or an incident, short enough that a value
 * this old is worth saying out loud. Only reached while the API answers; when
 * it cannot be reached at all there is no bound, since a day-old real prompt
 * beats no prompt. */
const MAX_STALE_MS = 24 * 60 * 60 * 1000;

/** Least recently used past this. A thousand prompts is far more than one
 * process serves and still bounds the memory a long-running server holds. */
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
