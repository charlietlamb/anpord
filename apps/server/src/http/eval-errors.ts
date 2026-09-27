import type { CredentialError } from "@anpord/eval/credentials/errors";
import type {
  EvalNotFound,
  EvalStoreError,
  NotRunnable,
  StartRefused,
} from "@anpord/eval/domain/errors";
import { BadRequest, Conflict, NotFound } from "@anpord/schema/domain/errors";
import { Effect } from "effect";
import { credentialApiError } from "./credential-errors";
import { logAndDie } from "./log-and-die";

type EvalDomainError =
  | CredentialError
  | EvalNotFound
  | EvalStoreError
  | NotRunnable
  | StartRefused;

const logged = logAndDie("Unhandled eval failure");

const toHttpError = (
  error: EvalDomainError
): Effect.Effect<never, BadRequest | Conflict | NotFound> => {
  switch (error._tag) {
    case "CredentialError": {
      const mapped = credentialApiError(error);
      return mapped._tag === "InternalError"
        ? logged(error)
        : Effect.fail(mapped);
    }
    case "EvalNotFound":
      return Effect.fail(new NotFound({ message: error.message }));
    case "NotRunnable":
      return Effect.fail(new Conflict({ message: error.problems.join("; ") }));
    case "StartRefused":
      return error.retryable
        ? Effect.fail(new Conflict({ message: error.reason }))
        : Effect.fail(new BadRequest({ message: error.reason }));
    case "EvalStoreError":
      return logged(error);
    default:
      return logged(error satisfies never);
  }
};

export const withEvalErrors = <A, R>(
  effect: Effect.Effect<A, EvalDomainError, R>
) => Effect.catchAll(effect, toHttpError);
