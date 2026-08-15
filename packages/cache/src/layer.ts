import { Effect, Layer, Option, Redacted } from "effect";
import { Redis } from "ioredis";
import { Cache } from "./cache";
import { CacheConfig } from "./config";
import { noopCache } from "./noop-cache";
import { makeRedisCache } from "./redis-cache";

export const CacheLive = Layer.scoped(
  Cache,
  Effect.gen(function* () {
    const { ttlSeconds, url } = yield* CacheConfig;

    if (Option.isNone(url)) {
      yield* Effect.logWarning(
        "REDIS_URL unset — reads go straight to the store"
      );
      return noopCache;
    }

    const redis = yield* Effect.acquireRelease(
      Effect.sync(
        () => new Redis(Redacted.value(url.value), { maxRetriesPerRequest: 2 })
      ),
      (client) => Effect.promise(() => client.quit()).pipe(Effect.orDie)
    );

    return makeRedisCache(redis, ttlSeconds);
  })
);
