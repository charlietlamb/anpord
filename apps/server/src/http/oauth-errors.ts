import type {
  OAuthClientNotFound,
  OAuthClientUnreadable,
} from "@anpord/auth/oauth/errors";
import { InternalError, NotFound } from "@anpord/schema/domain/errors";
import { Effect } from "effect";

type OAuthDomainError = OAuthClientNotFound | OAuthClientUnreadable;

const toHttpError = (error: OAuthDomainError) => {
  switch (error._tag) {
    case "OAuthClientNotFound":
      return new NotFound({ message: "No such client" });
    case "OAuthClientUnreadable":
      return new InternalError({ message: "Could not read the client" });
    default:
      return error satisfies never;
  }
};

export const withOAuthErrors = <A, R>(
  effect: Effect.Effect<A, OAuthDomainError, R>
) => Effect.mapError(effect, toHttpError);
