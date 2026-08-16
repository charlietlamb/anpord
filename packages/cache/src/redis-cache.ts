import { Effect, Option, Schema } from "effect";
import type { Redis } from "ioredis";
import type { CacheShape } from "./cache";

const SCAN_BATCH = 256;

const warn = (message: string, annotations: Record<string, string>) =>
  Effect.logWarning(message).pipe(Effect.annotateLogs(annotations));

export const makeRedisCache = (
  redis: Redis,
  ttlSeconds: number
): CacheShape => ({
  get: <A, I>(key: string, schema: Schema.Schema<A, I>) =>
    Effect.tryPromise(() => redis.get(key)).pipe(
      Effect.withSpan("Cache.read"),
      Effect.flatMap((raw) =>
        raw === null
          ? Effect.succeedNone
          : Schema.decodeUnknown(Schema.parseJson(schema))(raw).pipe(
              Effect.withSpan("Cache.decode"),
              Effect.map(Option.some),
              Effect.catchAll((issue) =>
                warn("cache payload no longer matches its schema", {
                  issue: String(issue),
                  key,
                }).pipe(Effect.as(Option.none<A>()))
              )
            )
      ),
      Effect.catchAll((cause) =>
        warn("cache get failed", { cause: String(cause), key }).pipe(
          Effect.as(Option.none<A>())
        )
      )
    ),

  set: <A, I>(key: string, schema: Schema.Schema<A, I>, value: A) =>
    Schema.encode(Schema.parseJson(schema))(value).pipe(
      Effect.flatMap((encoded) =>
        Effect.tryPromise(() => redis.set(key, encoded, "EX", ttlSeconds))
      ),
      Effect.asVoid,
      Effect.catchAll((cause) =>
        warn("cache set failed", { cause: String(cause), key })
      )
    ),

  invalidatePrefix: (prefix: string) =>
    Effect.tryPromise(async () => {
      let cursor = "0";
      do {
        const [next, keys] = await redis.scan(
          cursor,
          "MATCH",
          `${prefix}*`,
          "COUNT",
          SCAN_BATCH
        );
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        cursor = next;
      } while (cursor !== "0");
    }).pipe(
      Effect.catchAll((cause) =>
        warn("cache invalidate failed", { cause: String(cause), prefix })
      )
    ),
});
