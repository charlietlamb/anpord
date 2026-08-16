import { Auth } from "@anpord/auth";
import { Actor } from "@anpord/schema/actor";
import { Authentication } from "@anpord/schema/authentication";
import { Unauthorized } from "@anpord/schema/errors";
import { HttpApiBuilder, HttpServerRequest } from "@effect/platform";
import { Effect, Layer, Option, Schema } from "effect";

const unauthorized = (message: string) => new Unauthorized({ message });

export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const auth = yield* Auth;

    return Authentication.of({
      session: () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;

          const session = yield* Effect.tryPromise({
            try: () =>
              auth.api.getSession({ headers: new Headers(request.headers) }),
            catch: () => unauthorized("Could not verify the session"),
          });

          const user = Option.fromNullable(session?.user);
          const organizationId = Option.fromNullable(
            session?.session?.activeOrganizationId
          );

          if (Option.isNone(user)) {
            return yield* Effect.fail(unauthorized("Not signed in"));
          }

          if (Option.isNone(organizationId)) {
            return yield* Effect.fail(
              unauthorized("No active organization selected")
            );
          }

          return yield* Schema.decodeUnknown(Actor)({
            id: user.value.id,
            organizationId: organizationId.value,
          }).pipe(
            Effect.mapError(() =>
              unauthorized("Session identifiers are malformed")
            )
          );
        }),
    });
  })
).pipe(Layer.provide(HttpApiBuilder.middlewareCors()));
