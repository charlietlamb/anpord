import { Effect, Redacted } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { SandboxHandle } from "../../ports/sandbox";
import { runCommand } from "../sandbox/run-command";

const PREFIX = "~/.local";
export const OPENCODE_BIN = `${PREFIX}/bin/opencode`;

export const installOpencode = (sandbox: SandboxHandle, version: string) =>
  runCommand(
    sandbox,
    `npm i -g --prefix ${PREFIX} opencode-ai@${version} >/dev/null 2>&1`,
    { timeoutMs: 300_000 }
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
