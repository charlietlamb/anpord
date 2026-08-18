import { Clock, Effect, Option } from "effect";
import { asAnpordError } from "../errors";
import { isAvailabilityFailure } from "./failure";
import { fallbackPrompt } from "./fallback";
import { promptKey } from "./keys";
import { PromptCache, type PromptCacheShape } from "./prompt-cache";
import type { GetPromptOptions, PromptMetadata } from "./types";

interface Resolved<Value> {
  readonly metadata: PromptMetadata;
  readonly value: Value;
}

/**
 * Which answer the caller gets, in the order the answers are worth having.
 *
 * Fresh cache first, because that is the whole point. Then the API, since it
 * is the only source that can be right. Then whatever is held however old,
 * because a prompt someone wrote and promoted beats a string written at deploy
 * time. Then the fallback, which the caller asked for. Then the failure, since
 * with nothing cached and no fallback there is no honest answer to give.
 */
export const resolvePrompt = <Value>(options: GetPromptOptions) =>
  Effect.gen(function* () {
    const cache = (yield* PromptCache) as PromptCacheShape<Value>;
    const key = promptKey(options);

    const held = yield* cache.held(options);
    if (Option.isSome(held)) {
      return {
        metadata: {
          ageMs: held.value.ageMs,
          freshness: held.value.ageMs > 0 ? "cached" : "fresh",
          key,
        },
        value: held.value.value,
      } satisfies Resolved<Value>;
    }

    const loaded = yield* Effect.either(cache.load(options));
    if (loaded._tag === "Right") {
      return {
        metadata: { ageMs: 0, freshness: "fresh", key },
        value: loaded.right,
      } satisfies Resolved<Value>;
    }

    const error = asAnpordError(loaded.left);
    if (!isAvailabilityFailure(error)) {
      return yield* Effect.fail(error);
    }

    const remembered = yield* cache.stale(options);
    if (Option.isSome(remembered)) {
      return {
        metadata: {
          ageMs: remembered.value.ageMs,
          freshness: "stale",
          key,
          reason: error.message,
        },
        value: remembered.value.value,
      } satisfies Resolved<Value>;
    }

    if (options.fallback === undefined) {
      return yield* Effect.fail(error);
    }

    const now = yield* Clock.currentTimeMillis;
    return {
      metadata: { ageMs: 0, freshness: "fallback", key, reason: error.message },
      value: fallbackPrompt(options, options.fallback, now) as Value,
    } satisfies Resolved<Value>;
  }).pipe(
    Effect.withSpan("Prompts.resolve", {
      attributes: { key: promptKey(options) },
    })
  );
