import { Effect, Redacted } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { SandboxHandle } from "../../ports/sandbox";
import { runCommand } from "../sandbox/run-command";

export const OPENCODE_BIN = "~/.opencode/bin/opencode";

/* The published installer fetches one static binary for the platform.
   Measured on an E2B sandbox against the npm package, which resolves a
   platform binary through optional dependencies: the installer finished in
   three seconds, and npm ran out of the sandbox's memory or its five-minute
   window every time and left no binary behind. */
export const installOpencode = (sandbox: SandboxHandle, version: string) =>
  runCommand(
    sandbox,
    `curl -fsSL https://opencode.ai/install | VERSION=${version} bash >/dev/null 2>&1`,
    { timeoutMs: 120_000 }
  ).pipe(
    Effect.mapError(
      (cause) =>
        new HarnessUnavailable({ harness: "opencode", reason: cause.reason })
    ),
    Effect.withSpan("Opencode.install", { attributes: { version } })
  );

export const opencodeEnv = (
  credentials: Redacted.Redacted<string>
): Readonly<Record<string, string>> => ({
  OPENCODE_AUTH_CONTENT: Redacted.value(credentials),
  OPENCODE_DISABLE_MODELS_FETCH: "1",
});
