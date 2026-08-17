import { Auth } from "@anpord/auth";
import { OrganizationStore } from "@anpord/auth/organization";
import { Actor } from "@anpord/schema/domain/actor";
import { Unauthorized } from "@anpord/schema/domain/errors";
import { permissionsForRole } from "@anpord/schema/domain/permissions";
import { Authentication } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder, HttpServerRequest } from "@effect/platform";
import { Effect, Layer, Option, Schema } from "effect";

const unauthorized = (message: string) => new Unauthorized({ message });

export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const auth = yield* Auth;
    const organizations = yield* OrganizationStore;

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

          const role = yield* organizations
            .roleOf(organizationId.value, user.value.id)
            .pipe(Effect.orElseSucceed(() => Option.none<string>()));

          return yield* Schema.decodeUnknown(Actor)({
            id: user.value.id,
            organizationId: organizationId.value,
            permissions: Option.match(role, {
              onNone: () => [],
              onSome: permissionsForRole,
            }),
          }).pipe(
            Effect.mapError(() =>
              unauthorized("Session identifiers are malformed")
            )
          );
        }),
    });
  })
).pipe(Layer.provide(HttpApiBuilder.middlewareCors()));
