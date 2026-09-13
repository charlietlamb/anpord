import type { CredentialError } from "@anpord/eval/credentials/errors";
import type { EvalStoreError, NotRunnable } from "@anpord/eval/domain/errors";
import { Conflict, NotFound } from "@anpord/schema/domain/errors";
import { Effect } from "effect";

type EvalDomainError = CredentialError | EvalStoreError | NotRunnable;

type EvalHttpError = Conflict | NotFound;

/* Logged before dying: the platform discards the cause, leaving an empty 500. */
const logged = (error: unknown) =>
  Effect.logError("Unhandled eval failure", error).pipe(
    Effect.zipRight(Effect.die(error))
  );

const toHttpError = (
  error: EvalDomainError
): Effect.Effect<never, EvalHttpError> => {
  switch (error._tag) {
    case "CredentialError":
      return error.code === "not-found"
        ? Effect.fail(new NotFound({ message: error.message }))
        : logged(error);

    /* Every reason travels at once: fixing one and being told the next is
       worse than being told all of them now. */
    case "NotRunnable":
      return Effect.fail(new Conflict({ message: error.problems.join("; ") }));
    case "EvalStoreError":
      return logged(error);
    default:
      return logged(error satisfies never);
  }
};

export const withEvalErrors = <A, R>(
  effect: Effect.Effect<A, EvalDomainError, R>
) => Effect.catchAll(effect, toHttpError);
