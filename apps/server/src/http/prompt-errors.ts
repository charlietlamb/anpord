import type { PromptError } from "@anpord/prompts/errors";
import { Conflict, NotFound } from "@anpord/schema/domain/errors";
import { Effect } from "effect";
import { logAndDie } from "./log-and-die";

type PromptHttpError = Conflict | NotFound;

const logged = logAndDie("Unhandled prompt failure");

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
    case "ChannelMissing":
      return Effect.fail(
        new NotFound({ message: `No channel named "${error.channel}"` })
      );
    case "ChannelNameTaken":
      return Effect.fail(
        new Conflict({
          message: `A channel named "${error.channel}" already exists`,
        })
      );
    case "ChannelInUse":
      return Effect.fail(
        new Conflict({
          message: `"${error.channel}" is still used by ${error.promptCount} prompt(s)`,
        })
      );
    case "ChannelReserved":
      return Effect.fail(
        new Conflict({
          message: `"${error.channel}" is a reserved channel and cannot be renamed or deleted`,
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
    case "InvalidCursor":
      return Effect.fail(
        new NotFound({ message: "That page cursor is not valid" })
      );
    case "PromptStoreError":
      return logged(error);
    default:
      return logged(error satisfies never);
  }
};

export const withPromptErrors = <A, R>(
  effect: Effect.Effect<A, PromptError, R>
) => Effect.catchAll(effect, toHttpError);
