import { redactSecrets } from "@sphynx/schema/domain/secret-text";
import { Effect } from "effect";
import { shellQuote } from "../adapters/harness/process";
import { runCommandForOutcome } from "../adapters/sandbox/run-command";
import { PrepareFailed } from "../domain/errors";
import type { RequestedProfile } from "../domain/harness-profile";
import type { SandboxHandle } from "../ports/sandbox";

const INSTALL_TIMEOUT_MS = 600_000;

/* Through `bash -lc` so the login profile is read: an install putting a binary on
   the PATH expects the shell that finds it later to have seen the same rc files. */
export const runProfileInstall = (input: {
  readonly forwarded?: Readonly<Record<string, string>>;
  readonly profile: RequestedProfile;
  readonly sandbox: SandboxHandle;
  readonly secrets: readonly string[];
  readonly workspace: string;
}): Effect.Effect<void, PrepareFailed> => {
  const script = input.profile.install;

  if (!script) {
    return Effect.void;
  }

  return runCommandForOutcome(
    input.sandbox,
    `cd ${shellQuote(input.workspace)} && bash -lc ${shellQuote(script)}`,
    {
      env:
        input.forwarded === undefined ||
        Object.keys(input.forwarded).length === 0
          ? undefined
          : input.forwarded,
      timeoutMs: INSTALL_TIMEOUT_MS,
    }
  ).pipe(
    Effect.mapError(
      (cause) =>
        new PrepareFailed({
          name: input.profile.name,
          reason: redactSecrets(cause.reason, input.secrets),
        })
    ),
    Effect.flatMap((outcome) =>
      outcome.exitCode === 0
        ? Effect.void
        : Effect.fail(
            new PrepareFailed({
              name: input.profile.name,
              reason: redactSecrets(
                outcome.stderr.trim() ||
                  `Profile install exited with status ${outcome.exitCode}`,
                input.secrets
              ),
            })
          )
    ),
    Effect.withSpan("Profile.install")
  );
};
