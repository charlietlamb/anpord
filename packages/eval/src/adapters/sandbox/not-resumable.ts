import { Effect } from "effect";
import type { ProviderName } from "../../domain/cell";
import { SandboxUnavailable } from "../../domain/errors";
import type { CommandProgress, StartedCommand } from "../../ports/sandbox";

const refuse = (provider: ProviderName) =>
  new SandboxUnavailable({
    provider,
    reason: `${provider} cannot resume a command after a suspension`,
  });

/**
 * For a provider whose commands do not outlive the call that started them.
 *
 * Says nothing about caching: a provider answers for that separately, because
 * the two capabilities are unrelated and a provider that gained one should not
 * have to gain the other to say so.
 */
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

/**
 * For a provider with nowhere to keep what a prepare built.
 *
 * Stated rather than left off, so a handle that offers no cache says so on
 * purpose and a reader can tell the difference between a provider that cannot
 * and one nobody has got to yet.
 */
export const noCache = { cache: null } as const;
