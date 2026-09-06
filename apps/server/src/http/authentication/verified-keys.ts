import { Auth, type AuthInstance } from "@anpord/auth";
import type { Actor } from "@anpord/schema/domain/actor";
import type { Unauthorized } from "@anpord/schema/domain/errors";
import { Cache, Context, Duration, Effect, Exit, Layer } from "effect";
import { resolveApiKey } from "./api-key";

const CAPACITY = 4096;

/* The window in which a revoked key still answers on an uninformed instance. */
const TTL = Duration.seconds(5);

export interface VerifiedKeysShape {
  /* Called on revocation, which turns the TTL into a ceiling rather than the wait. */
  readonly forget: (token: string) => Effect.Effect<void>;
  readonly verify: (token: string) => Effect.Effect<Actor, Unauthorized>;
}

export class VerifiedKeys extends Context.Tag("@anpord/server/VerifiedKeys")<
  VerifiedKeys,
  VerifiedKeysShape
>() {}

/* Only a success is cached: caching a rejection would let a mistyped key lock out the real one behind it. */
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
