import type { AuthInstance } from "@anpord/auth";
import { Actor } from "@anpord/schema/domain/actor";
import { Unauthorized } from "@anpord/schema/domain/errors";
import type { Permission } from "@anpord/schema/domain/permissions";
import { Effect, Option, Schema } from "effect";

const unauthorized = (message: string) => new Unauthorized({ message });

const PERMISSION_SCOPES: readonly Permission[] = [
  "prompts:read",
  "prompts:write",
  "channels:read",
  "channels:write",
];

const isPermission = (scope: string): scope is Permission =>
  PERMISSION_SCOPES.includes(scope as Permission);

/**
 * A token carries only what the person approved on the consent screen. An
 * absent scope claim grants nothing rather than everything, so a token issued
 * before scopes were recorded cannot write.
 */
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
