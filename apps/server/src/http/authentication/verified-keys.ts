import type { AuthInstance } from "@anpord/auth";
import type { Actor } from "@anpord/schema/domain/actor";
import type { Unauthorized } from "@anpord/schema/domain/errors";
import { Cache, Effect, Exit } from "effect";
import { resolveApiKey } from "./api-key";

const CAPACITY = 4096;

/**
 * Verifying a key reads the database, and a caller sending a burst of requests
 * pays that round trip on every one of them.
 *
 * Only a successful verification is remembered, and only briefly: the window
 * is how long a revoked key keeps working, so it is seconds rather than
 * minutes. A rejection is never cached, so a mistyped key cannot lock out the
 * real one behind it.
 */
export const makeVerifiedKeys = (auth: AuthInstance) =>
  Cache.makeWith<string, Actor, Unauthorized>({
    capacity: CAPACITY,
    lookup: (token) => resolveApiKey(auth, token),
    timeToLive: (exit) => (Exit.isSuccess(exit) ? "30 seconds" : "0 millis"),
  }).pipe(Effect.map((cache) => (token: string) => cache.get(token)));
