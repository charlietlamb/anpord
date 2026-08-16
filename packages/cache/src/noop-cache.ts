import { Effect } from "effect";
import type { CacheShape } from "./cache";

export const noopCache: CacheShape = {
  get: () => Effect.succeedNone,
  invalidatePrefix: () => Effect.void,
  set: () => Effect.void,
};
