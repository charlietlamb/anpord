import type { PublicPromptWithVersions } from "@anpord/schema/public/shapes";
import { type Effect, Layer, Option } from "effect";
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
    held: () => Option.none() as never,
    invalidate: () => undefined as never,
    load: fetch,
    stale: () => Option.none() as never,
  } satisfies PromptCacheShape);
