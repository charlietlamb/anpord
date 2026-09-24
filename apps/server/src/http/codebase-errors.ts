import type { CodebaseFailure } from "@anpord/eval/codebase/codebase-connection";
import { BadRequest, InternalError } from "@anpord/schema/domain/errors";
import { Effect } from "effect";

const toHttpError = (
  error: CodebaseFailure
): Effect.Effect<never, BadRequest | InternalError> =>
  error._tag === "CodebaseUnconfigured"
    ? Effect.fail(new BadRequest({ message: error.message }))
    : Effect.logWarning(error.message).pipe(
        Effect.zipRight(
          Effect.fail(new InternalError({ message: "GitHub is unavailable" }))
        )
      );

export const withCodebaseErrors = <A, R>(
  effect: Effect.Effect<A, CodebaseFailure, R>
) => Effect.catchAll(effect, toHttpError);
