import { Config, Context, Layer, type Option } from "effect";
import type { Redacted } from "effect/Redacted";

export interface CacheConfigShape {
  readonly ttlSeconds: number;
  readonly url: Option.Option<Redacted<string>>;
}

export class CacheConfig extends Context.Tag("@anpord/cache/CacheConfig")<
  CacheConfig,
  CacheConfigShape
>() {}

export const CacheConfigLive = Layer.effect(
  CacheConfig,
  Config.all({
    url: Config.redacted("REDIS_URL").pipe(Config.option),
    ttlSeconds: Config.integer("CACHE_TTL_SECONDS").pipe(
      Config.withDefault(60)
    ),
  })
);
