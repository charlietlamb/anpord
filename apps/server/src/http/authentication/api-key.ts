import type { AuthInstance } from "@anpord/auth";
import { Actor } from "@anpord/schema/domain/actor";
import { Unauthorized } from "@anpord/schema/domain/errors";
import type { Permission } from "@anpord/schema/domain/permissions";
import { Effect, Option, Schema } from "effect";

const unauthorized = (message: string) => new Unauthorized({ message });

const API_KEY_PERMISSIONS: readonly Permission[] = [
  "prompts:read",
  "prompts:write",
  "channels:read",
  "channels:write",
  "evals:read",
  "evals:write",
];

export const resolveApiKey = (auth: AuthInstance, token: string) =>
  Effect.gen(function* () {
    const verified = yield* Effect.tryPromise({
      catch: () => unauthorized("Could not verify the API key"),
      try: () => auth.api.verifyApiKey({ body: { key: token } }),
    });

    const key = Option.fromNullable(verified.valid ? verified.key : null);
    if (Option.isNone(key)) {
      return yield* Effect.fail(unauthorized("Invalid API key"));
    }

    return yield* Schema.decodeUnknown(Actor)({
      id: key.value.referenceId,
      organizationId: key.value.referenceId,
      permissions: API_KEY_PERMISSIONS,
      isUser: false,
    }).pipe(Effect.mapError(() => unauthorized("API key is malformed")));
  }).pipe(Effect.withSpan("Authentication.resolveApiKey"));
