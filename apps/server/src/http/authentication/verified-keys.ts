import { Auth, type AuthInstance } from "@anpord/auth";
import type { Actor } from "@anpord/schema/domain/actor";
import type { Unauthorized } from "@anpord/schema/domain/errors";
import { Cache, Context, Duration, Effect, Exit, Layer } from "effect";
import { resolveApiKey } from "./api-key";

const CAPACITY = 4096;

/**
 * How long a revoked key keeps answering on an instance that has not been told
 * about the revocation. Short, because the dashboard promises the key stops
 * working immediately and this is the gap behind that promise.
 */
const TTL = Duration.seconds(5);

export interface VerifiedKeysShape {
  /** Forgets a key so the next request re-reads it. Called when a key is
   * revoked, which is what turns the TTL into a ceiling rather than the wait. */
  readonly forget: (token: string) => Effect.Effect<void>;
  readonly verify: (token: string) => Effect.Effect<Actor, Unauthorized>;
}

export class VerifiedKeys extends Context.Tag("@anpord/server/VerifiedKeys")<
  VerifiedKeys,
  VerifiedKeysShape
>() {}

/**
 * Verifying a key reads the database, and a caller sending a burst pays that
 * round trip on every request.
 *
 * Only a success is remembered. A rejection is never cached, so a mistyped key
 * cannot lock out the real one behind it, and a key revoked between requests is
 * refused as soon as the entry lapses or is forgotten.
 */
const make = (auth: AuthInstance) =>
  Cache.makeWith<string, Actor, Unauthorized>({
    capacity: CAPACITY,
    lookup: (token) => resolveApiKey(auth, token),
    timeToLive: (exit) => (Exit.isSuccess(exit) ? TTL : Duration.zero),
  }).pipe(
    Effect.map(
      (cache): VerifiedKeysShape => ({
        forget: (token) => cache.invalidate(token),
        verify: (token) => cache.get(token),
      })
    )
  );

export const VerifiedKeysLive = Layer.effect(
  VerifiedKeys,
  Effect.flatMap(Auth, make)
);
