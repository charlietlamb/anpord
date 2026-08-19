import { Chunk, Clock, Context, Effect, Layer, Stream } from "effect";
import type { ProviderName } from "../domain/cell";
import type { SandboxUnavailable } from "../domain/errors";
import { outcomeOf, type TrialOutcome } from "../domain/trial";
import {
  type ExecChunk,
  type SandboxHandle,
  SandboxProvider,
} from "../ports/sandbox";

interface RanCommand {
  readonly command: string;
  readonly durationMs: number;
  /** What the void gate reads: the output when there is any, and otherwise a
   * note that the command ran and exited. An empty stdout means a quiet
   * command, while a missing exit chunk means nothing executed at all, and
   * only the second is grounds for voiding a trial. */
  readonly evidence: string;
  readonly exitCode: number;
  readonly output: string;
}

export interface TrialRequest {
  readonly autoStopMinutes: number;
  readonly files: Readonly<Record<string, string>>;
  readonly provider: ProviderName;
  readonly setupCommand: string | null;
  readonly verifyCommand: string;
  readonly workspace: string;
}

interface TrialResult {
  readonly journal: readonly RanCommand[];
  readonly outcome: TrialOutcome;
  readonly sandboxId: string;
}

export interface TrialRunnerShape {
  /** Runs one trial to a verdict. The sandbox is scoped by the provider, so a
   * caller that forgets to close it cannot compile. */
  readonly run: (
    request: TrialRequest
  ) => Effect.Effect<TrialResult, SandboxUnavailable, SandboxProvider>;
}

export class TrialRunner extends Context.Tag("@anpord/eval/TrialRunner")<
  TrialRunner,
  TrialRunnerShape
>() {}

const exitCodeOf = (chunks: readonly ExecChunk[]) => {
  const exit = chunks.find((chunk) => chunk.stream === "exit");
  return exit === undefined ? 1 : exit.exitCode;
};

const outputOf = (chunks: readonly ExecChunk[]) =>
  chunks
    .filter((chunk) => chunk.stream !== "exit")
    .map((chunk) => chunk.data)
    .join("");

/** A quiet command is ordinary; a command the runner never started is not.
 * Reporting the exit status when there is no output keeps the void gate
 * answering "did this run" rather than "did this print". */
const evidenceOf = (output: string, exitCode: number, ran: boolean) => {
  if (output.trim() !== "") {
    return output;
  }

  return ran ? `exited ${exitCode}` : "";
};

/** Runs a command and records it, capturing the exit code at the call site
 * where it still exists. A harness that reports its own success is not the
 * instrument: this journal is. */
const runCommand = (sandbox: SandboxHandle, command: string) =>
  Effect.gen(function* () {
    const started = yield* Clock.currentTimeMillis;
    const chunks = yield* Stream.runCollect(sandbox.exec(command));
    const finished = yield* Clock.currentTimeMillis;
    const collected = Chunk.toReadonlyArray(chunks);

    const output = outputOf(collected).slice(0, 4000);
    const exitCode = exitCodeOf(collected);
    const ran = collected.some((chunk) => chunk.stream === "exit");

    return {
      command,
      durationMs: finished - started,
      evidence: evidenceOf(output, exitCode, ran),
      exitCode,
      output,
    } satisfies RanCommand;
  });

export const TrialRunnerLive = Layer.effect(
  TrialRunner,
  Effect.gen(function* () {
    const provider = yield* SandboxProvider;

    const run = (request: TrialRequest) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;

        const sandbox = yield* provider.open({
          autoStopMinutes: request.autoStopMinutes,
          provider: request.provider,
          workspace: request.workspace,
        });

        const journal: RanCommand[] = [];

        if (request.setupCommand !== null) {
          journal.push(yield* runCommand(sandbox, request.setupCommand));
        }

        for (const [path, content] of Object.entries(request.files)) {
          yield* sandbox.writeFile(`${request.workspace}/${path}`, content);
        }

        /* The verifier is run unpiped. A pipeline exits with its last command,
           so `bun test | tail` reports the success of tail while the runner exits 1,
           and any platform that trusts that records failures as passes. */
        const verify = yield* runCommand(sandbox, request.verifyCommand);
        journal.push(verify);

        const finishedAt = yield* Clock.currentTimeMillis;

        return {
          journal,
          outcome: outcomeOf({
            commandCount: journal.length,
            exitCode: verify.exitCode,
            /* The gate asks whether the command ran, which is not the same
               question as whether it printed anything. */
            fingerprint: { verify: verify.evidence },
            modelMs: 0,
            sandboxMs: finishedAt - startedAt,
          }),
          sandboxId: sandbox.id,
        } satisfies TrialResult;
      }).pipe(
        Effect.scoped,
        Effect.withSpan("TrialRunner.run", {
          attributes: { provider: request.provider },
        }),
        Effect.annotateLogs({ provider: request.provider })
      );

    return TrialRunner.of({ run });
  })
);
