import { Chunk, Effect, Layer, Stream } from "effect";
import { outcomeOf } from "../domain/trial";
import type { ExecChunk, SandboxHandle } from "../ports/sandbox";
import { type ScoreRequest, Scorer } from "../ports/scorer";

const PIPE = /\|/;

/** A pipeline exits with its last command, so `bun test | tail` reports the
 * success of tail while the runner exits 1. A verifier written that way records
 * every failure as a pass, which is the defect this product exists to find,
 * so it is refused at the point of scoring rather than discovered in a result. */
export const isUnguardedPipeline = (command: string) =>
  PIPE.test(command) &&
  !command.includes("PIPESTATUS") &&
  !command.includes("pipefail");

const outputOf = (chunks: readonly ExecChunk[]) =>
  chunks
    .filter((chunk) => chunk.stream !== "exit")
    .map((chunk) => chunk.data)
    .join("");

const exitOf = (chunks: readonly ExecChunk[]) =>
  chunks.find((chunk) => chunk.stream === "exit");

const verify = (sandbox: SandboxHandle, command: string) =>
  Stream.runCollect(sandbox.exec(command, { timeoutMs: 300_000 })).pipe(
    Effect.map(Chunk.toReadonlyArray)
  );

/**
 * The verdict comes from running the tests, not from judging the diff.
 *
 * This is the only scorer the MVP ships. A model-graded scorer would be
 * another Layer behind the same tag, and it is deliberately absent: a judge
 * drifts between versions, and the regression signal is the one thing that has
 * to stay stable across months.
 */
export const ScorerGroundTruthLive = Layer.succeed(
  Scorer,
  Scorer.of({
    score: (request: ScoreRequest) =>
      Effect.gen(function* () {
        if (isUnguardedPipeline(request.verifyCommand)) {
          return outcomeOf({
            commandCount: request.commandCount,
            exitCode: 1,
            fingerprint: { verify: "" },
            modelMs: request.modelMs,
            sandboxMs: 0,
          });
        }

        const chunks = yield* verify(
          request.sandbox,
          request.verifyCommand
        ).pipe(
          Effect.catchAll(() => Effect.succeed([] as readonly ExecChunk[]))
        );

        const exit = exitOf(chunks);
        const output = outputOf(chunks);
        const exitCode = exit === undefined ? 1 : exit.exitCode;

        return outcomeOf({
          commandCount: request.commandCount,
          exitCode,
          /* Evidence that the verifier ran, which is not the same question as
             whether it printed. A silent pass is ordinary; a verifier that
             never started is what voids a trial. */
          fingerprint: {
            verify:
              output.trim() === "" && exit !== undefined
                ? `exited ${exitCode}`
                : output,
          },
          modelMs: request.modelMs,
          sandboxMs: 0,
        });
      }).pipe(Effect.withSpan("Scorer.score")),
  })
);
