import { type AnpordApi, layer } from "@anpord/schema/public/client";
import { Effect, Redacted } from "effect";

import { baseUrl } from "./config";

const failure = (message: string) => ({
  content: [{ text: message, type: "text" as const }],
  isError: true,
});

const describe = (error: unknown) =>
  typeof error === "object" && error !== null && "message" in error
    ? String((error as { message: unknown }).message)
    : "The request failed. Please try again.";

export const runAs = <A, E>(
  accessToken: string,
  effect: Effect.Effect<A, E, AnpordApi>
) =>
  effect.pipe(
    Effect.provide(layer({ apiKey: Redacted.make(accessToken), baseUrl })),
    Effect.catchAll((error) => Effect.succeed(failure(describe(error)))),
    Effect.catchAllCause((cause) =>
      Effect.logError("mcp tool failed", cause).pipe(
        Effect.as(failure("The request failed. Please try again."))
      )
    ),
    Effect.runPromise
  );
