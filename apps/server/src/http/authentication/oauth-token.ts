import type { AuthInstance } from "@sphynx/auth";
import { Actor } from "@sphynx/schema/domain/actor";
import type { Permission } from "@sphynx/schema/domain/permissions";
import { API_SCOPES } from "@sphynx/schema/domain/scopes";
import { Effect, Option, Schema } from "effect";
import { unauthorized } from "./unauthorized";

const isPermission = (scope: string): scope is Permission =>
  API_SCOPES.includes(scope as Permission);

const permissionsForScopes = (
  scopes: readonly string[] | string | undefined
): readonly Permission[] => {
  if (scopes === undefined) {
    return [];
  }
  const list = typeof scopes === "string" ? scopes.split(" ") : scopes;
  return list.filter(isPermission);
};

export const resolveOAuthToken = (
  auth: AuthInstance,
  token: string,
  organizationOf: (
    userId: string
  ) => Effect.Effect<Option.Option<string>, unknown>
) =>
  Effect.gen(function* () {
    const session = yield* Effect.tryPromise({
      catch: () => unauthorized("Could not verify the access token"),
      try: () =>
        auth.api.getMcpSession({
          headers: new Headers({ authorization: `Bearer ${token}` }),
        }),
    });

    const userId = Option.fromNullable(session?.userId);
    if (Option.isNone(userId)) {
      return yield* Effect.fail(unauthorized("Access token is not active"));
    }

    const organizationId = yield* organizationOf(userId.value).pipe(
      Effect.mapError(() => unauthorized("Could not resolve the organization"))
    );

    return yield* Schema.decodeUnknown(Actor)({
      id: userId.value,
      organizationId: Option.getOrUndefined(organizationId),
      permissions: permissionsForScopes(session?.scopes),
      isUser: true,
    }).pipe(
      Effect.mapError(() => unauthorized("No organization for this user"))
    );
  });
