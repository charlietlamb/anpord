import type { CredentialError } from "@anpord/eval/credentials/errors";
import {
  BadRequest,
  InternalError,
  NotFound,
} from "@anpord/schema/domain/errors";
import { Effect } from "effect";

const apiError = (error: CredentialError) => {
  if (error.code === "not-found") {
    return new NotFound({ message: error.message });
  }

  if (error.code === "internal") {
    return new InternalError({ message: "Credential operation failed" });
  }

  return new BadRequest({ message: error.message });
};

export const handledCredential = <A, R>(
  effect: Effect.Effect<A, CredentialError, R>
) => effect.pipe(Effect.mapError(apiError));

export const handledPublicCredential = <A, R>(
  effect: Effect.Effect<A, CredentialError, R>
) =>
  effect.pipe(
    Effect.mapError(apiError),
    Effect.catchTag("InternalError", Effect.die)
  );
