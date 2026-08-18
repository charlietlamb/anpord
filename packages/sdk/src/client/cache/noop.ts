import { Effect, Layer, Option } from "effect";
import { PromptCache, type PromptCacheShape } from "./prompt-cache";
import type { PromptSelector } from "./types";

/** Disabled caching is a cache that holds nothing, so the one code path in
 * `resolvePrompt` still runs rather than being wrapped in a condition. */
export const noopLayer = <Value>(
  fetch: (selector: PromptSelector) => Effect.Effect<Value, unknown>
) =>
  Layer.succeed(PromptCache, {
    held: () => Effect.succeed(Option.none()),
    invalidate: () => Effect.void,
    load: fetch,
    stale: () => Effect.succeed(Option.none()),
  } satisfies PromptCacheShape<Value> as PromptCacheShape<unknown>);
