import { Effect, Redacted, Stream } from "effect";
import { HarnessUnavailable } from "../domain/errors";
import type { SandboxHandle } from "../ports/sandbox";

/**
 * Installed under the user's own prefix rather than globally.
 *
 * The Daytona image manages node through nvm, so a global install writes to a
 * root-owned directory and fails on permissions, while `sudo npm` cannot find
 * npm at all because sudo drops the nvm PATH. A user prefix avoids both.
 */
const PREFIX = "~/.local";
export const CODEX_BIN = `${PREFIX}/bin/codex`;

/**
 * Pinning the version is not tidiness, it is the comparison.
 *
 * A cell key carries the harness version, so an unpinned install silently
 * compares two different harnesses. It also breaks outright: the image ships
 * an older Codex that cannot parse the current models response and dies with
 * `unknown variant`, having authenticated perfectly well first.
 */
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

/**
 * Credentials arrive as the file the CLI writes for itself.
 *
 * A ChatGPT subscription authenticates over OAuth rather than with an API key,
 * and `--with-access-token` is not in every build, so the auth file is the one
 * path that works across versions. It is written to the sandbox and it is the
 * caller's business to decide whether that is acceptable: the credential is
 * not scoped to a trial and cannot be revoked without ending every session it
 * belongs to. The proxy replaces this, and until then a run is as trusted as
 * the code it runs.
 */
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
