import { Effect } from "effect";
import type { CacheShape } from "./cache";

/** Used when REDIS_URL is unset so callers read straight through to the store. */
export const noopCache: CacheShape = {
  get: () => Effect.succeedNone,
  invalidatePrefix: () => Effect.void,
  set: () => Effect.void,
};
