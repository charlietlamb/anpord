import type { AuthInstance } from "@anpord/auth";
import { Actor } from "@anpord/schema/domain/actor";
import { Unauthorized } from "@anpord/schema/domain/errors";
import { Effect, Option, Schema } from "effect";

const unauthorized = (message: string) => new Unauthorized({ message });

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

    const metadata = (key.value.metadata ?? {}) as {
      readonly createdBy?: string;
    };

    return yield* Schema.decodeUnknown(Actor)({
      id: metadata.createdBy ?? key.value.referenceId,
      organizationId: key.value.referenceId,
    }).pipe(Effect.mapError(() => unauthorized("API key is malformed")));
  }).pipe(Effect.withSpan("Authentication.resolveApiKey"));
