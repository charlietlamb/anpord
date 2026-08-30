import { Effect, Stream } from "effect";
import { SandboxUnavailable } from "../../domain/errors";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";

export interface CommandOutcome {
  readonly exitCode: number;
  readonly stderr: string;
}

/* Kept small because it exists to be read: a clone that fails says why in its
   last line or two, and the rest is progress output nobody reads. */
const STDERR_LIMIT = 2000;

/**
 * Runs a command and reports how it went, rather than failing on a bad status.
 *
 * The caller decides what a non-zero status means. A clone that cannot reach a
 * repository is not the same failure as a sandbox that died, and only the
 * caller knows which of the two it asked for.
 */
export const runCommandForOutcome = (
  sandbox: SandboxHandle,
  command: string,
  options?: ExecOptions
): Effect.Effect<CommandOutcome, SandboxUnavailable> =>
  sandbox.exec(command, options).pipe(
    Stream.runFold({ exitCode: 1, stderr: "" }, (outcome, chunk) => {
      if (chunk.stream === "exit") {
        return { ...outcome, exitCode: chunk.exitCode };
      }

      if (chunk.stream === "stderr") {
        return {
          ...outcome,
          stderr: `${outcome.stderr}${chunk.data}`.slice(-STDERR_LIMIT),
        };
      }

      return outcome;
    })
  );

export const runCommand = (
  sandbox: SandboxHandle,
  command: string,
  options?: ExecOptions
) =>
  runCommandForOutcome(sandbox, command, options).pipe(
    Effect.flatMap((outcome) =>
      outcome.exitCode === 0
        ? Effect.void
        : Effect.fail(
            new SandboxUnavailable({
              provider: sandbox.provider,
              reason: `Command exited with status ${outcome.exitCode}`,
            })
          )
    )
  );
