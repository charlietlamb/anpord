import type { PublicPromptWithVersions } from "@anpord/schema/public/shapes";
import { Clock, Effect, Option } from "effect";
import { asAnpordError } from "../errors";
import { isAvailabilityFailure } from "./failure";
import { fallbackPrompt } from "./fallback";
import { promptKey } from "./keys";
import { PromptCache } from "./prompt-cache";
import type { GetPromptOptions, PromptMetadata } from "./types";

interface Resolved {
  readonly metadata: PromptMetadata;
  readonly value: PublicPromptWithVersions;
}

/** Ordered by how good the answer is: fresh cache, API, stale cache, caller's
 * fallback, then the failure. */
export const resolvePrompt = (options: GetPromptOptions) =>
  Effect.gen(function* () {
    const cache = yield* PromptCache;
    const key = promptKey(options);

    const held = yield* cache.held(options);
    if (Option.isSome(held)) {
      return {
        metadata: {
          ageMs: held.value.ageMs,
          /* Where the answer came from, not how old it is -- a zero-age hit
             is still a hit, not a network read. */
          freshness: "cached",
          key,
        },
        value: held.value.value,
      } satisfies Resolved;
    }

    const loaded = yield* Effect.either(cache.load(options));
    if (loaded._tag === "Right") {
      return {
        metadata: { ageMs: 0, freshness: "fresh", key },
        value: loaded.right,
      } satisfies Resolved;
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
      } satisfies Resolved;
    }

    if (options.fallback === undefined) {
      return yield* Effect.fail(error);
    }

    const now = yield* Clock.currentTimeMillis;
    return {
      metadata: { ageMs: 0, freshness: "fallback", key, reason: error.message },
      value: fallbackPrompt(options, options.fallback, now),
    } satisfies Resolved;
  }).pipe(
    Effect.withSpan("Prompts.resolve", {
      attributes: { key: promptKey(options) },
    })
  );
