import {
  AnpordApi,
  type AnpordClient,
  layer,
} from "@anpord/schema/public/client";
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

export interface ToolContext {
  readonly auth: { readonly accessToken: string };
}

export const callApi = <A, E>(
  ctx: ToolContext,
  use: (api: AnpordClient) => Effect.Effect<A, E>
) =>
  Effect.flatMap(AnpordApi, use).pipe(
    Effect.provide(
      layer({ apiKey: Redacted.make(ctx.auth.accessToken), baseUrl })
    ),
    Effect.catchAll((error) => Effect.succeed(failure(describe(error)))),
    Effect.catchAllCause((cause) =>
      Effect.logError("mcp tool failed", cause).pipe(
        Effect.as(failure("The request failed. Please try again."))
      )
    ),
    Effect.runPromise
  );
