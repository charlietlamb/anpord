import { Data } from "effect";
import type { PromptSelector } from "./types";

/* Structural, not referential: a plain object literal hashes by reference and
   every call would miss. */
const cacheKey = (selector: PromptSelector) =>
  Data.struct({
    channel: selector.channel,
    id: selector.id,
    includeVersions: selector.includeVersions,
    version: selector.version,
  });

type CacheKey = ReturnType<typeof cacheKey>;

export type { CacheKey };
export { cacheKey };
