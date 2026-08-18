import type { PublicPromptWithVersions } from "@anpord/schema/public/shapes";
import { Effect, Layer } from "effect";
import { PromptCache, type PromptCacheShape } from "./prompt-cache";
import type { PromptSelector } from "./types";

/** Disabled caching is a cache that holds nothing, so the one path through
 * `resolvePrompt` still runs rather than being wrapped in a condition. */
export const noopLayer = (
  fetch: (
    selector: PromptSelector
  ) => Effect.Effect<PublicPromptWithVersions, unknown>
) =>
  Layer.succeed(PromptCache, {
    /** Effects rather than bare values: yielding an Option would make an empty
     * one a failure, and every read would end in NoSuchElementException. */
    held: () => Effect.succeedNone,
    invalidate: () => Effect.void,
    load: fetch,
    stale: () => Effect.succeedNone,
  } satisfies PromptCacheShape);
