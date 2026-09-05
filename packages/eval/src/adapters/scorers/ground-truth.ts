import { Chunk, Effect, Layer, Random, Stream } from "effect";
import {
  ANSWER_ENV,
  ANSWER_PATH,
  TRANSCRIPT_ENV,
  TRANSCRIPT_PATH,
} from "../../domain/answer-file";
import { answerOf, transcriptOf } from "../../domain/journal";
import { outcomeOf } from "../../domain/trial";
import {
  stepResultsOf,
  verifyScriptOf,
  withoutMarks,
} from "../../domain/verify-script";
import type { ExecChunk, SandboxHandle } from "../../ports/sandbox";
import { type ScoreRequest, Scorer } from "../../ports/scorer";

/** A single `|` that is not `||`, outside single or double quotes. */
const isUnguardedPipeline = (command: string) => {
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

const verify = (
  sandbox: SandboxHandle,
  command: string,
  workspace: string,
  env?: Readonly<Record<string, string>>
) =>
  Stream.runCollect(
    sandbox.exec(command, { cwd: workspace, env, timeoutMs: 300_000 })
  ).pipe(Effect.map(Chunk.toReadonlyArray));

const RESULT = "ANPORD_VALIDATOR_RESULT=";
const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const validatorResultOf = (output: string) => {
  const line = output.split("\n").findLast((entry) => entry.startsWith(RESULT));

  if (line === undefined) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(line.slice(RESULT.length));
    return typeof value === "object" &&
      value !== null &&
      typeof (value as { passed?: unknown }).passed === "boolean" &&
      ((value as { message?: unknown }).message === undefined ||
        typeof (value as { message?: unknown }).message === "string")
      ? (value as { readonly message?: string; readonly passed: boolean })
      : null;
  } catch {
    return null;
  }
};

/** What the agent said, on disk beside the workspace rather than in it, so a
 * verifier can read the reply without the reply becoming part of the diff. */
const writeAnswer = (sandbox: SandboxHandle, events: ScoreRequest["events"]) =>
  Effect.all(
    [
      sandbox.writeFile(ANSWER_PATH(sandbox.home), answerOf(events)),
      sandbox.writeFile(TRANSCRIPT_PATH(sandbox.home), transcriptOf(events)),
    ],
    { discard: true }
  );

const answerEnv = (sandbox: SandboxHandle) => ({
  [ANSWER_ENV]: ANSWER_PATH(sandbox.home),
  [TRANSCRIPT_ENV]: TRANSCRIPT_PATH(sandbox.home),
});

const runValidator = (
  sandbox: SandboxHandle,
  source: string,
  workspace: string,
  prepared: Readonly<Record<string, unknown>>
) =>
  Effect.gen(function* () {
    /* Named from the runtime's own randomness so a seeded run is
       reproducible, and so two validators in one sandbox never collide. */
    const suffix = yield* Random.nextIntBetween(0x10_00_00_00, 0x7f_ff_ff_ff);
    const path = `${sandbox.home}/.anpord-validator-${suffix.toString(16)}.mjs`;
    yield* sandbox.writeFile(path, source);
    return yield* verify(sandbox, `node ${quoted(path)}`, workspace, {
      ...answerEnv(sandbox),
      ANPORD_PREPARE_VALUE: JSON.stringify(prepared),
    });
  });

const scoreValidator = (
  request: ScoreRequest & {
    readonly validator: NonNullable<ScoreRequest["validator"]>;
  }
) =>
  Effect.gen(function* () {
    const chunks = yield* runValidator(
      request.sandbox,
      request.validator.source,
      request.workspace,
      request.prepared ?? {}
    );
    const result = validatorResultOf(outputOf(chunks));

    return outcomeOf({
      commandCount: request.commandCount,
      exitCode: result?.passed === true ? 0 : 1,
      fingerprint: {
        validator:
          result === null
            ? ""
            : (result.message ??
              `${request.validator.name} ${result.passed ? "passed" : "failed"}`),
      },
      modelMs: request.modelMs,
      sandboxMs: 0,
    });
  });

/** The verdict comes from running the tests, not from judging the diff. */
export const ScorerGroundTruthLive = Layer.succeed(
  Scorer,
  Scorer.of({
    score: (request: ScoreRequest) =>
      Effect.gen(function* () {
        yield* writeAnswer(request.sandbox, request.events);

        if (request.validator != null) {
          return yield* scoreValidator({
            ...request,
            validator: request.validator,
          });
        }

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
            fingerprint: { verify: "refused: the verifier is a pipeline" },
            modelMs: request.modelMs,
            sandboxMs: 0,
          });
        }

        const script = verifyScriptOf(request.verifyCommand);
        const chunks = yield* verify(
          request.sandbox,
          script.command,
          request.workspace,
          answerEnv(request.sandbox)
        );

        const exit = exitOf(chunks);
        const raw = outputOf(chunks);
        const output = withoutMarks(raw);
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
          verifySteps: stepResultsOf(script, raw),
        });
      }).pipe(Effect.withSpan("Scorer.score")),
  })
);
