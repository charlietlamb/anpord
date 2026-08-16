import { Context, type Effect, type Option, type Schema } from "effect";

export interface CacheShape {
  readonly get: <A, I>(
    key: string,
    schema: Schema.Schema<A, I>
  ) => Effect.Effect<Option.Option<A>>;
  readonly invalidatePrefix: (prefix: string) => Effect.Effect<void>;
  readonly set: <A, I>(
    key: string,
    schema: Schema.Schema<A, I>,
    value: A
  ) => Effect.Effect<void>;
}

export class Cache extends Context.Tag("@anpord/cache/Cache")<
  Cache,
  CacheShape
>() {}
