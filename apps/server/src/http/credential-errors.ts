import type { CredentialError } from "@anpord/eval/credentials/errors";
import {
  BadRequest,
  InternalError,
  NotFound,
} from "@anpord/schema/domain/errors";
import { Effect } from "effect";

export const credentialApiError = (error: CredentialError) => {
  switch (error.code) {
    case "not-found":
      return new NotFound({ message: error.message });
    case "internal":
    case "undecryptable":
      return new InternalError({ message: "Credential operation failed" });
    case undefined:
      return new BadRequest({ message: error.message });
    default:
      return error.code satisfies never;
  }
};

export const withCredentialErrors = <A, R>(
  effect: Effect.Effect<A, CredentialError, R>
) => effect.pipe(Effect.mapError(credentialApiError));

export const withPublicCredentialErrors = <A, R>(
  effect: Effect.Effect<A, CredentialError, R>
) =>
  effect.pipe(
    Effect.mapError(credentialApiError),
    Effect.catchTag("InternalError", Effect.die)
  );
