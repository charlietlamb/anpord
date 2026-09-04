import { Effect } from "effect";
import { shellQuote } from "../adapters/harness/process";
import { runCommandForOutcome } from "../adapters/sandbox/run-command";
import { PrepareFailed } from "../domain/errors";
import type { RequestedProfile } from "../domain/harness-profile";
import type { SandboxHandle } from "../ports/sandbox";

const INSTALL_TIMEOUT_MS = 600_000;

/**
 * A profile's install command, run before the harness.
 *
 * Through `bash -lc` so the login profile is read: an install that puts a
 * binary on the PATH expects the shell that finds it later to have seen the
 * same rc files. Available to every base, because installing what a profile
 * needs is not a property of which harness reads it afterwards.
 */
export const runProfileInstall = (input: {
  readonly profile: RequestedProfile;
  readonly sandbox: SandboxHandle;
  readonly workspace: string;
}): Effect.Effect<void, PrepareFailed> => {
  const script = input.profile.install;

  if (!script) {
    return Effect.void;
  }

  return runCommandForOutcome(
    input.sandbox,
    `cd ${shellQuote(input.workspace)} && bash -lc ${shellQuote(script)}`,
    { timeoutMs: INSTALL_TIMEOUT_MS }
  ).pipe(
    Effect.mapError(
      (cause) =>
        new PrepareFailed({ name: input.profile.name, reason: cause.reason })
    ),
    Effect.flatMap((outcome) =>
      outcome.exitCode === 0
        ? Effect.void
        : Effect.fail(
            new PrepareFailed({
              name: input.profile.name,
              reason:
                outcome.stderr.trim() ||
                `Profile install exited with status ${outcome.exitCode}`,
            })
          )
    ),
    Effect.withSpan("Profile.install")
  );
};
