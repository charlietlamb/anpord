import { Effect, type Redacted, Stream } from "effect";
import type { HarnessUnavailable, SandboxUnavailable } from "../domain/errors";
import { authenticateCodex, installCodex } from "../harness/codex-install";
import type { SandboxHandle } from "../ports/sandbox";

export interface PrepareWorkspace {
  readonly credentials: Redacted.Redacted<string>;
  readonly files: Readonly<Record<string, string>>;
  readonly harnessVersion: string;
  readonly home: string;
  readonly sandbox: SandboxHandle;
  readonly setupCommand: string | null;
  readonly workspace: string;
}

/**
 * Everything that has to be true before an agent starts, in the order it has
 * to be true in.
 *
 * Separated from running the trial because it is a different reason to change:
 * a new harness alters what gets installed here and nothing about how a run is
 * scored. Its failures are the harness's, not the sandbox's, so a boot problem
 * and a missing binary stay distinguishable to the retry boundary.
 */
export const prepareWorkspace = (
  input: PrepareWorkspace
): Effect.Effect<void, HarnessUnavailable | SandboxUnavailable> =>
  Effect.gen(function* () {
    yield* installCodex(input.sandbox, input.harnessVersion);
    yield* authenticateCodex(input.sandbox, input.credentials, input.home);

    for (const [path, content] of Object.entries(input.files)) {
      yield* input.sandbox.writeFile(`${input.workspace}/${path}`, content);
    }

    if (input.setupCommand !== null) {
      yield* Stream.runDrain(
        input.sandbox.exec(input.setupCommand, { timeoutMs: 300_000 })
      );
    }
  }).pipe(Effect.withSpan("Workspace.prepare"));
