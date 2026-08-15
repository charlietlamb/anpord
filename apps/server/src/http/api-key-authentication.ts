import { Auth } from "@anpord/auth";
import { Actor } from "@anpord/schema/actor";
import { Unauthorized } from "@anpord/schema/errors";
import { ApiKeyAuthentication } from "@anpord/schema/public/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer, Option, Redacted, Schema } from "effect";

const unauthorized = (message: string) => new Unauthorized({ message });

export const ApiKeyAuthenticationLive = Layer.effect(
  ApiKeyAuthentication,
  Effect.gen(function* () {
    const auth = yield* Auth;

    return ApiKeyAuthentication.of({
      bearer: (token) =>
        Effect.gen(function* () {
          const verified = yield* Effect.tryPromise({
            try: () =>
              auth.api.verifyApiKey({
                body: { key: Redacted.value(token) },
              }),
            catch: () => unauthorized("Could not verify the API key"),
          });

          if (!verified.valid) {
            return yield* Effect.fail(unauthorized("Invalid API key"));
          }

          const key = Option.fromNullable(verified.key);
          if (Option.isNone(key)) {
            return yield* Effect.fail(unauthorized("Invalid API key"));
          }

          /** The key belongs to an organization; the user is whoever minted it. */
          const metadata = (key.value.metadata ?? {}) as {
            readonly createdBy?: string;
          };

          return yield* Schema.decodeUnknown(Actor)({
            id: metadata.createdBy ?? key.value.referenceId,
            organizationId: key.value.referenceId,
          }).pipe(Effect.mapError(() => unauthorized("API key is malformed")));
        }),
    });
  })
).pipe(Layer.provide(HttpApiBuilder.middlewareCors()));
