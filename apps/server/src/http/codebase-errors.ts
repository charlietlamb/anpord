import type { CodebaseFailure } from "@sphynx/eval/codebase/codebase-connection";
import { BadRequest, InternalError } from "@sphynx/schema/domain/errors";
import { Effect } from "effect";

const toHttpError = (
  error: CodebaseFailure
): Effect.Effect<never, BadRequest | InternalError> => {
  switch (error._tag) {
    case "CodebaseUnconfigured":
      return Effect.fail(new BadRequest({ message: error.message }));
    case "CodebaseError":
      return Effect.logWarning(error.message).pipe(
        Effect.zipRight(
          Effect.fail(new InternalError({ message: "GitHub is unavailable" }))
        )
      );
    default:
      return error satisfies never;
  }
};

export const withCodebaseErrors = <A, R>(
  effect: Effect.Effect<A, CodebaseFailure, R>
) => Effect.catchAll(effect, toHttpError);
