import type { AuthInstance } from "@anpord/auth";
import { Actor } from "@anpord/schema/domain/actor";
import { Unauthorized } from "@anpord/schema/domain/errors";
import { Effect, Option, Schema } from "effect";

const unauthorized = (message: string) => new Unauthorized({ message });

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
    }).pipe(
      Effect.mapError(() => unauthorized("No organization for this user"))
    );
  });
