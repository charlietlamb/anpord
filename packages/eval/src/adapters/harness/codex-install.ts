import { Effect } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { SandboxHandle } from "../../ports/sandbox";
import { runCommand } from "../sandbox/run-command";

const PREFIX = "~/.local";
export const CODEX_BIN = `${PREFIX}/bin/codex`;

export const installCodex = (sandbox: SandboxHandle, version: string) =>
  runCommand(
    sandbox,
    `npm i -g --prefix ${PREFIX} @openai/codex@${version} >/dev/null 2>&1`,
    { timeoutMs: 300_000 }
  ).pipe(
    Effect.mapError(
      (cause) =>
        new HarnessUnavailable({ harness: "codex", reason: cause.reason })
    ),
    Effect.withSpan("Codex.install", { attributes: { version } })
  );

export const authenticateCodex = (
  sandbox: SandboxHandle,
  auth: string,
  home: string
) =>
  sandbox.writeFile(`${home}/.codex/auth.json`, auth).pipe(
    Effect.mapError(
      (cause) =>
        new HarnessUnavailable({ harness: "codex", reason: cause.reason })
    ),
    Effect.withSpan("Codex.authenticate")
  );
