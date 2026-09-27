import type {
  OAuthClientNotFound,
  OAuthClientUnreadable,
} from "@anpord/auth/oauth/errors";
import { InternalError, NotFound } from "@anpord/schema/domain/errors";
import { Effect } from "effect";

type OAuthDomainError = OAuthClientNotFound | OAuthClientUnreadable;

const toHttpError = (
  error: OAuthDomainError
): Effect.Effect<never, InternalError | NotFound> => {
  switch (error._tag) {
    case "OAuthClientNotFound":
      return Effect.fail(new NotFound({ message: "No such client" }));
    case "OAuthClientUnreadable":
      return Effect.logError(
        "Could not read the OAuth client",
        error.cause
      ).pipe(
        Effect.zipRight(
          Effect.fail(
            new InternalError({ message: "Could not read the client" })
          )
        )
      );
    default:
      return error satisfies never;
  }
};

export const withOAuthErrors = <A, R>(
  effect: Effect.Effect<A, OAuthDomainError, R>
) => Effect.catchAll(effect, toHttpError);
