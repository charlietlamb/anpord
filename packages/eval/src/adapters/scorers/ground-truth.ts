import type { EvalCodeValidator } from "@anpord/schema/domain/evals";
import { Chunk, Effect, Layer, Option, Random, Schema, Stream } from "effect";
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

    /* `||` is a fallback, not a pipeline. */
    if (command[index + 1] === "|") {
      index++;
      continue;
    }

    if (command[index - 1] === "|") {
      continue;
    }

    /* A pipeline exits with its last command, so `bun test | tail` would record
       every failure as a pass. Refused unless PIPESTATUS or pipefail is used. */
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

  return Schema.decodeUnknownOption(
    Schema.parseJson(
      Schema.Struct({
        passed: Schema.Boolean,
        message: Schema.optional(Schema.String),
      })
    )
  )(line.slice(RESULT.length)).pipe(Option.getOrNull);
};

/* Beside the workspace, not in it, so the reply never becomes part of the diff. */
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
    /* From the runtime's randomness, so a seeded run is reproducible and two
       validators in one sandbox never collide. */
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
    readonly validator: typeof EvalCodeValidator.Type;
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

export const ScorerGroundTruthLive = Layer.succeed(
  Scorer,
  Scorer.of({
    score: (request: ScoreRequest) =>
      Effect.gen(function* () {
        yield* writeAnswer(request.sandbox, request.events);

        if (request.validator != null && "source" in request.validator) {
          return yield* scoreValidator({
            ...request,
            validator: request.validator,
          });
        }

        /* Nothing decides this case, and a pass here would be full confidence
           from zero evidence. */
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
          /* Whether the verifier ran, not whether it printed: a silent pass is
             ordinary, a verifier that never started voids the trial. */
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
