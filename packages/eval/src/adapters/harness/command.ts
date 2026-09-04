import { Effect, Option } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { RequestedProfile } from "../../domain/harness-profile";
import type {
  HarnessDriverShape,
  PrepareHarness,
  RunHarness,
} from "../../ports/harness";
import { commandCommand, recorderPath } from "./command-line";
import { COMMAND_RECORDER } from "./command-recorder";
import { commandSession } from "./command-session";
import { writeHarnessFile } from "./support";

const missing = (reason: string) =>
  new HarnessUnavailable({ harness: "command", reason });

const profileOf = (profile: Option.Option<RequestedProfile>, reason: string) =>
  Option.match(profile, {
    onNone: () => Effect.fail(missing(reason)),
    onSome: Effect.succeed,
  });

/**
 * A customer's own process, run inside the sandbox.
 *
 * Every capability is claimed because the contract offers every event; what a
 * given process reports is its own business, and a column left empty is a
 * fact about that agent rather than about the harness.
 */
export const CommandDriver: HarnessDriverShape = {
  capabilities: {
    commands: true,
    fileChanges: true,
    streaming: true,
    usage: true,
  },
  harness: "command",
  prepare: (input: PrepareHarness) =>
    Effect.gen(function* () {
      yield* writeHarnessFile(
        input,
        "command",
        recorderPath(input.home),
        COMMAND_RECORDER
      );

      /* The install runs in the workspace step, after the profile's files
         exist for it to read. Nothing of ours is on the PATH and nothing of
         ours holds a key: the profile's env and the env credential's values
         reach the sandbox through the materialiser. */
      return {};
    }).pipe(Effect.withSpan("Command.prepare")),
  run: (request: RunHarness) =>
    Effect.gen(function* () {
      const profile = yield* profileOf(
        request.profile,
        "A command task needs a profile"
      );
      const run = profile.run;

      if (run === null) {
        return yield* Effect.fail(missing("The profile has no run command"));
      }

      return yield* commandSession(request, commandCommand(request, run));
    }).pipe(Effect.withSpan("CommandRunner.run")),
};
