import { Effect, Redacted, Stream } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { SandboxHandle } from "../../ports/sandbox";

/** A user prefix, because the Daytona image manages node through nvm: a
 * global install hits permissions and `sudo npm` loses the nvm PATH. */
const PREFIX = "~/.local";
export const CODEX_BIN = `${PREFIX}/bin/codex`;

/** Pinned because the cell key carries the version: an unpinned install
 * silently compares two different harnesses. */
export const installCodex = (sandbox: SandboxHandle, version: string) =>
  Stream.runDrain(
    sandbox.exec(
      `npm i -g --prefix ${PREFIX} @openai/codex@${version} >/dev/null 2>&1`,
      { timeoutMs: 300_000 }
    )
  ).pipe(
    Effect.mapError(
      (cause) =>
        new HarnessUnavailable({ harness: "codex", reason: cause.reason })
    ),
    Effect.withSpan("Codex.install", { attributes: { version } })
  );

/** Credentials arrive as the file the CLI writes for itself. */
export const authenticateCodex = (
  sandbox: SandboxHandle,
  auth: Redacted.Redacted<string>,
  home: string
) =>
  sandbox.writeFile(`${home}/.codex/auth.json`, Redacted.value(auth)).pipe(
    Effect.mapError(
      (cause) =>
        new HarnessUnavailable({ harness: "codex", reason: cause.reason })
    ),
    Effect.withSpan("Codex.authenticate")
  );
