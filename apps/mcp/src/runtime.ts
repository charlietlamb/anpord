import { type AnpordApi, layer } from "anpord/client";
import { baseUrlConfig } from "anpord/config";
import { Effect, Redacted } from "effect";

/**
 * A client per caller, not per process: the token belongs to the person who
 * authorised this request, so two users of the same server never share one.
 */
export const runAs = <A, E>(
  accessToken: string,
  effect: Effect.Effect<A, E, AnpordApi>
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const baseUrl = yield* baseUrlConfig;
      return yield* effect.pipe(
        Effect.provide(layer({ apiKey: Redacted.make(accessToken), baseUrl }))
      );
    })
  );
