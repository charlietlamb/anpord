import { type AnpordApi, layer } from "anpord/client";
import { Cause, Effect, Redacted } from "effect";
import { baseUrl } from "./config";

const failure = (message: string) => ({
  content: [{ text: message, type: "text" as const }],
  isError: true,
});

/**
 * A client per caller, not per process: the token belongs to the person who
 * authorised this request, so two users of the same server never share one.
 * Expected failures become a readable message, since a model can act on
 * "no such prompt" and cannot act on a rejected promise.
 */
export const runAs = <A, E>(
  accessToken: string,
  effect: Effect.Effect<A, E, AnpordApi>
) =>
  effect.pipe(
    Effect.provide(layer({ apiKey: Redacted.make(accessToken), baseUrl })),
    Effect.catchAllCause((cause) =>
      Effect.succeed(failure(Cause.pretty(cause)))
    ),
    Effect.runPromise
  );
