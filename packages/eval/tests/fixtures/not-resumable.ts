import { Effect } from "effect";
import { SandboxUnavailable } from "../../src/domain/errors";
import type { CommandProgress, StartedCommand } from "../../src/ports/sandbox";

const refused = new SandboxUnavailable({
  provider: "daytona",
  reason: "this fixture does not resume commands",
});

export const notResumableFixture = {
  cache: null,
  progress: (
    _started: StartedCommand
  ): Effect.Effect<CommandProgress, SandboxUnavailable> => Effect.fail(refused),
  start: (
    _command: string
  ): Effect.Effect<StartedCommand, SandboxUnavailable> => Effect.fail(refused),
};
