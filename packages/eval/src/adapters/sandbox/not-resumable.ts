import { Effect } from "effect";
import type { ProviderName } from "../../domain/cell";
import { SandboxUnavailable } from "../../domain/errors";
import type { CommandProgress, StartedCommand } from "../../ports/sandbox";

const refuse = (provider: ProviderName) =>
  new SandboxUnavailable({
    provider,
    reason: `${provider} cannot resume a command after a suspension`,
  });

export const notResumable = (provider: ProviderName) => ({
  progress: (
    _started: StartedCommand
  ): Effect.Effect<CommandProgress, SandboxUnavailable> =>
    Effect.fail(refuse(provider)),
  start: (
    _command: string
  ): Effect.Effect<StartedCommand, SandboxUnavailable> =>
    Effect.fail(refuse(provider)),
});
