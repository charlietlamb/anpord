import type { PromptError } from "@anpord/prompts/errors";
import { Conflict, NotFound } from "@anpord/schema/domain/errors";
import { Effect } from "effect";

type PromptHttpError = Conflict | NotFound;

const toHttpError = (
  error: PromptError
): Effect.Effect<never, PromptHttpError> => {
  switch (error._tag) {
    case "PromptNotFound":
      return Effect.fail(
        new NotFound({ message: `No prompt with id "${error.id}"` })
      );
    case "VersionNotFound":
      return Effect.fail(
        new NotFound({
          message: `Version ${error.version} of "${error.promptId}" does not exist`,
        })
      );
    case "ChannelNotFound":
      return Effect.fail(
        new NotFound({
          message: `"${error.promptId}" has no ${error.channel} channel`,
        })
      );
    case "PromptIdTaken":
      return Effect.fail(
        new Conflict({
          message: `A prompt with id "${error.id}" already exists`,
        })
      );
    case "VersionConflict":
      return Effect.fail(
        new Conflict({
          message: "A version was created concurrently. Please retry.",
        })
      );
    case "PromptHasNoVersions":
      return Effect.fail(
        new NotFound({ message: `"${error.promptId}" has no versions yet` })
      );
    case "PromptStoreError":
      return Effect.die(error);
    default:
      return Effect.die(error satisfies never);
  }
};

export const withPromptErrors = <A, R>(
  effect: Effect.Effect<A, PromptError, R>
) => Effect.catchAll(effect, toHttpError);
