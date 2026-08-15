import type { PromptError } from "@anpord/prompts/errors";
import { Conflict, NotFound } from "@anpord/schema/errors";
import { Effect } from "effect";

type PromptHttpError = Conflict | NotFound;

/**
 * Domain errors carry no transport concern, so the mapping lives here rather
 * than leaking status codes into the service. A store failure is deliberately
 * left to fail the request as a defect — it is not a client-correctable state.
 */
export const toHttpError = (
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
    case "PromptStoreError":
      return Effect.die(error);
    default:
      return Effect.die(error satisfies never);
  }
};
