import {
  Cache,
  Clock,
  Context,
  Data,
  Duration,
  Effect,
  Exit,
  Layer,
  Option,
} from "effect";
import { promptKey, promptPrefix } from "./keys";
import type { CacheSettings } from "./settings";
import type { PromptSelector } from "./types";

/** Structural rather than referential, so two identical selectors are one
 * entry and one in-flight request rather than two. A plain object literal
 * hashes by reference and every call would miss. */
const cacheKey = (selector: PromptSelector) =>
  Data.struct({
    channel: selector.channel,
    id: selector.id,
    includeVersions: selector.includeVersions,
    version: selector.version,
  });

type CacheKey = ReturnType<typeof cacheKey>;

interface Held<Value> {
  readonly ageMs: number;
  readonly value: Value;
}

export interface PromptCacheShape<Value> {
  /** Fresh enough to serve, or absent. A stale entry starts a refresh and is
   * still returned, so no caller waits for a value that already exists. */
  readonly held: (
    selector: PromptSelector
  ) => Effect.Effect<Option.Option<Held<Value>>>;
  readonly invalidate: (id: string) => Effect.Effect<void>;
  /** Asks the network and keeps the answer. Never serves what is already
   * held: `held` and `stale` decide that, and a load that quietly returned
   * an old value would make the order they are tried in meaningless. */
  readonly load: (selector: PromptSelector) => Effect.Effect<Value, unknown>;
  /** Whatever is held, however old. Only for when the API cannot be reached:
   * there is no age at which failing outright is the better answer. */
  readonly stale: (
    selector: PromptSelector
  ) => Effect.Effect<Option.Option<Held<Value>>>;
}

export class PromptCache extends Context.Tag("@anpord/sdk/PromptCache")<
  PromptCache,
  PromptCacheShape<unknown>
>() {}

const make = <Value>(
  settings: CacheSettings,
  fetch: (selector: PromptSelector) => Effect.Effect<Value, unknown>
) =>
  Effect.gen(function* () {
    const scope = yield* Effect.scope;
    const permits = yield* Effect.makeSemaphore(settings.maxConcurrentRefresh);

    const cache = yield* Cache.makeWith<CacheKey, Value, unknown>({
      capacity: settings.capacity,
      lookup: (selector) => fetch(selector),
      /** A failure is not an answer, so it is not kept: the next call tries
       * again rather than waiting out a whole window on one bad response. */
      timeToLive: (exit) =>
        Exit.isFailure(exit) ? Duration.zero : Duration.infinity,
    });

    /** A pinned version cannot change, so only capacity ever evicts it. A
     * channel can be repointed at any moment. */
    const ttlFor = (selector: CacheKey) =>
      selector.version === undefined
        ? settings.ttlMs
        : Number.POSITIVE_INFINITY;

    const ageOf = (key: CacheKey) =>
      Effect.gen(function* () {
        const stats = yield* cache.entryStats(key);
        if (Option.isNone(stats)) {
          return Option.none<number>();
        }
        const now = yield* Clock.currentTimeMillis;
        return Option.some(Math.max(0, now - stats.value.loadedMillis));
      });

    /** Forked into the cache's own scope rather than as a daemon, so a client
     * that is disposed takes its refreshes with it. A refresh that cannot get
     * a permit is dropped: the next call will ask again. */
    const revalidate = (key: CacheKey) =>
      permits
        .withPermitsIfAvailable(1)(cache.refresh(key))
        .pipe(
          Effect.catchAllCause(() => Effect.void),
          Effect.forkIn(scope),
          Effect.asVoid
        );

    const heldWithin = (selector: PromptSelector, limitMs: number) =>
      Effect.gen(function* () {
        const key = cacheKey(selector);
        const ttl = ttlFor(key);
        const value = yield* cache.getOptionComplete(key);
        const age = yield* ageOf(key);

        if (Option.isNone(value) || Option.isNone(age)) {
          return Option.none<Held<Value>>();
        }
        if (age.value > limitMs) {
          return Option.none<Held<Value>>();
        }
        if (age.value > ttl) {
          yield* revalidate(key);
        }
        return Option.some({ ageMs: age.value, value: value.value });
      });

    return {
      held: (selector) => heldWithin(selector, settings.maxStaleMs),
      invalidate: (id) =>
        Effect.gen(function* () {
          const prefix = promptPrefix(id);
          const keys = yield* cache.keys;
          yield* Effect.forEach(
            keys.filter((key) => promptKey(key).startsWith(prefix)),
            (key) => cache.invalidate(key),
            { discard: true }
          );
        }).pipe(Effect.withSpan("PromptCache.invalidate")),
      load: (selector) =>
        Effect.gen(function* () {
          const key = cacheKey(selector);
          const value = yield* fetch(selector);
          yield* cache.set(key, value);
          return value;
        }).pipe(
          Effect.withSpan("PromptCache.load", {
            attributes: { key: promptKey(selector) },
          })
        ),
      stale: (selector) => heldWithin(selector, Number.POSITIVE_INFINITY),
    } satisfies PromptCacheShape<Value>;
  });

export const layer = <Value>(
  settings: CacheSettings,
  fetch: (selector: PromptSelector) => Effect.Effect<Value, unknown>
) =>
  Layer.scoped(
    PromptCache,
    make(settings, fetch) as Effect.Effect<
      PromptCacheShape<unknown>,
      never,
      never
    >
  );
