import type { CredentialError } from "@anpord/eval/credentials/errors";
import {
  BadRequest,
  InternalError,
  NotFound,
} from "@anpord/schema/domain/errors";
import { Effect } from "effect";

export const credentialApiError = (error: CredentialError) => {
  if (error.code === "not-found") {
    return new NotFound({ message: error.message });
  }

  if (error.code === "internal" || error.code === "undecryptable") {
    return new InternalError({ message: "Credential operation failed" });
  }

  return new BadRequest({ message: error.message });
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
