import { Auth } from "@anpord/auth";
import {
  OrganizationStore,
  type OrganizationStoreShape,
} from "@anpord/auth/organization";
import { Actor } from "@anpord/schema/domain/actor";
import { Unauthorized } from "@anpord/schema/domain/errors";
import { permissionsForRole } from "@anpord/schema/domain/permissions";
import { Authentication } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder, HttpServerRequest } from "@effect/platform";
import {
  Cache,
  Data,
  Duration,
  Effect,
  Exit,
  Layer,
  Option,
  Schema,
} from "effect";

const unauthorized = (message: string) => new Unauthorized({ message });
const ROLE_CACHE_CAPACITY = 4096;
const ROLE_CACHE_TTL = Duration.seconds(5);

interface RoleKey {
  readonly organizationId: string;
  readonly userId: string;
}

export const makeRoleCache = (
  organizations: Pick<OrganizationStoreShape, "roleOf">
) =>
  Cache.makeWith({
    capacity: ROLE_CACHE_CAPACITY,
    lookup: (key: RoleKey) =>
      organizations.roleOf(key.organizationId, key.userId),
    timeToLive: (exit) =>
      Exit.isSuccess(exit) ? ROLE_CACHE_TTL : Duration.zero,
  });

export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const auth = yield* Auth;
    const organizations = yield* OrganizationStore;
    const roles = yield* makeRoleCache(organizations);

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

          const role = yield* roles
            .get(
              Data.struct({
                organizationId: organizationId.value,
                userId: user.value.id,
              })
            )
            .pipe(Effect.orElseSucceed(() => Option.none<string>()));

          return yield* Schema.decodeUnknown(Actor)({
            id: user.value.id,
            organizationId: organizationId.value,
            permissions: Option.match(role, {
              onNone: () => [],
              onSome: permissionsForRole,
            }),
            isUser: true,
          }).pipe(
            Effect.mapError(() =>
              unauthorized("Session identifiers are malformed")
            )
          );
        }),
    });
  })
).pipe(Layer.provide(HttpApiBuilder.middlewareCors()));
