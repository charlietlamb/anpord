import { Effect, Option } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { HarnessDriverShape } from "../../ports/harness";
import { commandCommand, recorderPath } from "./command-line";
import { COMMAND_RECORDER } from "./command-recorder";
import { commandSession } from "./command-session";

const unavailable = (reason: string) =>
  new HarnessUnavailable({ harness: "command", reason });

export const CommandDriver: HarnessDriverShape = {
  harness: "command",
  prepare: (input) =>
    input.sandbox.writeFile(recorderPath(input.home), COMMAND_RECORDER).pipe(
      Effect.mapError((cause) => unavailable(cause.reason)),
      Effect.as({}),
      Effect.withSpan("Command.prepare")
    ),
  run: (request) =>
    Effect.gen(function* () {
      const profile = yield* Option.match(request.profile, {
        onNone: () =>
          Effect.fail(unavailable("A command task needs a profile")),
        onSome: Effect.succeed,
      });

      if (profile.run === null) {
        return yield* Effect.fail(
          unavailable("The profile has no run command")
        );
      }

      return yield* commandSession(
        request,
        commandCommand(request, profile.run)
      );
    }).pipe(Effect.withSpan("Command.run")),
};
