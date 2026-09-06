import type { PublicPromptWithVersions } from "@anpord/schema/public/shapes";
import { Effect, Layer } from "effect";
import { PromptCache, type PromptCacheShape } from "./prompt-cache";
import type { PromptSelector } from "./types";

/* Disabled caching is a cache holding nothing, so `resolvePrompt` keeps one
   path rather than being wrapped in a condition. */
export const noopLayer = (
  fetch: (
    selector: PromptSelector
  ) => Effect.Effect<PublicPromptWithVersions, unknown>
) =>
  Layer.succeed(PromptCache, {
    /* Effects, not bare Options: yielding an empty Option fails with
       NoSuchElementException. */
    held: () => Effect.succeedNone,
    invalidate: () => Effect.void,
    load: fetch,
    stale: () => Effect.succeedNone,
  } satisfies PromptCacheShape);
