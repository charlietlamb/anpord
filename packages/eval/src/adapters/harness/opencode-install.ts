import { Effect, Option, Redacted } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { SandboxHandle } from "../../ports/sandbox";
import { runCommand } from "../sandbox/run-command";

export const OPENCODE_BIN = "~/.opencode/bin/opencode";

/* The static binary: npm's optional-dependency install exhausts a small sandbox. */
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
  credentials: Option.Option<Redacted.Redacted<string>>
): Readonly<Record<string, string>> => ({
  ...Option.match(credentials, {
    onNone: () => ({}),
    onSome: (auth) => ({ OPENCODE_AUTH_CONTENT: Redacted.value(auth) }),
  }),
  OPENCODE_DISABLE_MODELS_FETCH: "1",
});
