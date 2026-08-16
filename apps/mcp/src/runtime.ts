import { type AnpordApi, layer } from "anpord/client";
import { Cause, Effect, Redacted } from "effect";
import { baseUrl } from "./config";

const failure = (message: string) => ({
  content: [{ text: message, type: "text" as const }],
  isError: true,
});

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
