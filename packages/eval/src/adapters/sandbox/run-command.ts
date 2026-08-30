import { Effect, Stream } from "effect";
import { SandboxUnavailable } from "../../domain/errors";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";

export interface CommandOutcome {
  readonly exitCode: number;
  readonly stderr: string;
}

const STDERR_LIMIT = 2000;

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

export const runCommandOrFail = <E>(
  sandbox: SandboxHandle,
  command: string,
  onFailure: (outcome: CommandOutcome) => E,
  options?: ExecOptions
): Effect.Effect<void, E | SandboxUnavailable> =>
  runCommandForOutcome(sandbox, command, options).pipe(
    Effect.flatMap((outcome) =>
      outcome.exitCode === 0 ? Effect.void : Effect.fail(onFailure(outcome))
    )
  );

export const runCommand = (
  sandbox: SandboxHandle,
  command: string,
  options?: ExecOptions
) =>
  runCommandOrFail(
    sandbox,
    command,
    (outcome) =>
      new SandboxUnavailable({
        provider: sandbox.provider,
        reason: `Command exited with status ${outcome.exitCode}`,
      }),
    options
  );
