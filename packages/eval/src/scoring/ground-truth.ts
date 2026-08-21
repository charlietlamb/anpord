import { Chunk, Effect, Layer, Stream } from "effect";
import { outcomeOf } from "../domain/trial";
import type { ExecChunk, SandboxHandle } from "../ports/sandbox";
import { type ScoreRequest, Scorer } from "../ports/scorer";

/** A single `|` that is not `||`, outside single or double quotes.
 *
 * A bare substring test refuses far too much: `node --test || exit 1` is a
 * defensive verifier, and `grep -E 'a|b'` is an ordinary one. Both were
 * rejected before, which voided every trial in the cell before the sandbox was
 * even touched and reported a pass rate of zero with no diagnostic. */
export const isUnguardedPipeline = (command: string) => {
  let quote: string | null = null;

  for (let index = 0; index < command.length; index++) {
    const character = command[index];

    if (quote !== null) {
      if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (character !== "|") {
      continue;
    }

    /* `||` is a fallback, not a pipeline: its exit code is the last command
       that actually ran, which is what we want to read. */
    if (command[index + 1] === "|") {
      index++;
      continue;
    }

    if (command[index - 1] === "|") {
      continue;
    }

    /* A pipeline exits with its last command, so `bun test | tail` reports the
       success of tail while the runner exits 1. A verifier written that way
       records every failure as a pass, which is the defect this product exists
       to find, so it is refused rather than discovered in a result. */
    return !(command.includes("PIPESTATUS") || command.includes("pipefail"));
  }

  return false;
};

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
        /* Nothing decides this case, so there is nothing to report but the
           absence. Returning a pass here would be the void gate's own bug in
           a new place: maximum confidence from zero evidence, deterministic
           and promotable as a baseline that can never move. */
        if (request.verifyCommand === null) {
          return outcomeOf({
            commandCount: request.commandCount,
            exitCode: -1,
            fingerprint: { verify: "" },
            modelMs: request.modelMs,
            sandboxMs: 0,
          });
        }

        if (isUnguardedPipeline(request.verifyCommand)) {
          return outcomeOf({
            commandCount: request.commandCount,
            exitCode: 1,
            /* Named rather than empty. An empty fingerprint is a void
               pattern, so this used to report a misconfigured verifier
               through the same channel as a broken provider and the two were
               indistinguishable in the data. A verifier we refuse to trust is
               a failure of the case, not an absence of evidence. */
            fingerprint: { verify: "refused: the verifier is a pipeline" },
            modelMs: request.modelMs,
            sandboxMs: 0,
          });
        }

        /* Allowed to fail. Catching here turned a dead sandbox into an
           empty result, which the exit-code default then read as a failing
           test: infrastructure reported as product, which is the failure the
           void gate exists to prevent. */
        const chunks = yield* verify(request.sandbox, request.verifyCommand);

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
