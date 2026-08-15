import { Context, type Effect, type Option, type Schema } from "effect";

export interface CacheShape {
  /**
   * Entries survive deploys, so a stored payload may predate the current
   * schema. Decoding rather than casting turns that into a miss instead of a
   * malformed value flowing through the system.
   */
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
