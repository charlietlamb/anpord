import {
  type EvalValidation,
  type ValidationValue,
  validationCapture,
  validationExecution,
  validationSnapshot,
} from "@anpord/schema/domain/eval-validations";
import type { EvalCodeValidator } from "@anpord/schema/domain/evals";
import { Clock, Effect, Layer, Option, Random, Schema } from "effect";
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
import type { SandboxHandle } from "../../ports/sandbox";
import {
  type ScoreRequest,
  Scorer,
  type ScorerShape,
} from "../../ports/scorer";
import { executeValidation, publishValidation } from "./validation";

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

const resultStatus = (passed: boolean) =>
  passed ? ("passed" as const) : ("failed" as const);

const processError = (execution: {
  invalid: boolean;
  interrupted: boolean;
  exitCode: number | null;
}) => {
  if (execution.invalid) {
    return "Invalid validation protocol";
  }
  if (execution.interrupted || execution.exitCode === null) {
    return "Validator execution interrupted before process exit";
  }
  if (execution.exitCode !== 0) {
    return `Validator process exited ${execution.exitCode}`;
  }
  return null;
};

const completeValidations = (
  records: readonly EvalValidation[],
  message: string | null,
  finished: number,
  error: ValidationValue | null
) => {
  const incomplete = records.findIndex(
    (record) => record.status === "running" || record.status === "queued"
  );
  const errorIndex =
    incomplete >= 0
      ? incomplete
      : records.findLastIndex((record) => record.status !== "skipped");
  const hasError = records.some((record) => record.status === "error");
  return records
    .map((record, index): EvalValidation => {
      if (
        index === errorIndex &&
        (incomplete >= 0 || (message !== null && !hasError))
      ) {
        return {
          ...record,
          status: "error",
          message: message ?? "Validator did not return a complete result",
          error: record.error ?? error,
          durationMs:
            record.startedAt === null
              ? null
              : Math.max(0, finished - record.startedAt),
        };
      }
      if (record.status === "queued" || record.status === "running") {
        return {
          ...record,
          status: "skipped",
          message: "An earlier validator did not complete",
        };
      }
      return record;
    })
    .map(validationSnapshot);
};

const legacyValidation = (
  record: EvalValidation,
  execution: {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    rawTruncated: boolean;
  },
  finished: number,
  capture: ReturnType<typeof validationCapture>
): EvalValidation => {
  const raw = validatorResultOf(execution.stdout);
  return {
    ...record,
    status: raw === null ? "error" : resultStatus(raw.passed),
    message: (
      raw?.message ?? (raw === null ? "Validator returned no valid result" : "")
    ).slice(0, 2000),
    output: raw === null ? record.output : capture(raw),
    durationMs: Math.max(0, finished - (record.startedAt ?? finished)),
    exitCode: execution.exitCode,
    logs: [
      {
        index: 0,
        at: finished,
        level: "stdout",
        value: capture(execution.stdout, "text"),
      },
      {
        index: 1,
        at: finished,
        level: "stderr",
        value: capture(execution.stderr, "text"),
      },
    ],
    truncated: execution.rawTruncated,
  };
};

const scoreValidator = (
  request: ScoreRequest & { readonly validator: typeof EvalCodeValidator.Type }
) =>
  Effect.gen(function* () {
    const started = yield* Clock.currentTimeMillis;
    const suffix = yield* Random.nextIntBetween(0x10_00_00_00, 0x7f_ff_ff_ff);
    const path = `${request.sandbox.home}/.anpord-validator-${suffix.toString(16)}.mjs`;
    const manifest = request.validator.manifest ?? [
      { index: 0, name: request.validator.name },
    ];
    const records = manifest.map((check, index) => ({
      ...validationExecution(
        {
          ...check,
          id: `${request.validationPrefix ?? ""}code:${check.index}`,
          kind: "code",
        },
        index === 0 ? started : null
      ),
      status: index === 0 ? ("running" as const) : ("queued" as const),
    }));
    yield* request.sandbox.writeFile(path, request.validator.source);
    const execution = yield* executeValidation({
      sandbox: request.sandbox,
      command: `node ${quoted(path)}`,
      options: {
        cwd: request.workspace,
        timeoutMs: 300_000,
        env: {
          ...answerEnv(request.sandbox),
          ANPORD_PREPARE_VALUE: JSON.stringify(request.prepared ?? {}),
        },
      },
      records,
      prefix: request.validationPrefix,
      observe: request.onValidation,
    });
    const finished = yield* Clock.currentTimeMillis;
    const capture = validationCapture(request.validator.capture !== false);
    const validations = completeValidations(
      request.validator.manifest === undefined
        ? execution.records.map((record) =>
            legacyValidation(record, execution, finished, capture)
          )
        : execution.records,
      processError(execution),
      finished,
      execution.stderr ? capture(execution.stderr, "text") : null
    );
    const failed = validations.some((record) => record.status === "failed");
    const invalid =
      validations.some((record) => record.status === "error") ||
      processError(execution) !== null;
    for (const record of validations) {
      yield* publishValidation(record, request.onValidation);
    }
    return {
      commandCount: request.commandCount,
      modelMs: request.modelMs,
      sandboxMs: 0,
      exitCode: invalid ? execution.exitCode || -1 : Number(failed),
      status: invalid ? ("void" as const) : resultStatus(!failed),
      passed: !(invalid || failed),
      validations,
      verifySteps: [],
      voidFields: invalid ? ["validator"] : [],
    };
  });

const scoreCommand: ScorerShape["score"] = (request) =>
  Effect.gen(function* () {
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
      const validation: EvalValidation = {
        ...validationExecution(
          {
            id: "command:0",
            index: 0,
            name: "Verify command",
            kind: "command",
          },
          null
        ),
        status: "failed",
        message: "Verifier refused: pipelines must use pipefail or PIPESTATUS",
        input: validationCapture()({ command: request.verifyCommand }),
      };
      yield* publishValidation(validation, request.onValidation);
      return {
        ...outcomeOf({
          commandCount: request.commandCount,
          exitCode: 1,
          fingerprint: { verify: "refused: the verifier is a pipeline" },
          modelMs: request.modelMs,
          sandboxMs: 0,
        }),
        validations: [validation],
      };
    }

    const script = verifyScriptOf(request.verifyCommand);
    const started = yield* Clock.currentTimeMillis;
    const capture = validationCapture();
    const record = {
      ...validationExecution(
        {
          id: "command:0",
          index: 0,
          kind: "command",
          name: "Verify command",
        },
        started
      ),
      input: capture({
        command: request.verifyCommand,
        executed: script.command,
      }),
    };
    const execution = yield* executeValidation({
      sandbox: request.sandbox,
      command: script.command,
      options: {
        cwd: request.workspace,
        env: answerEnv(request.sandbox),
        timeoutMs: 300_000,
      },
      records: [record],
      observe: request.onValidation,
    });
    const raw = execution.stdout + execution.stderr;
    const output = withoutMarks(raw);
    const interrupted = execution.exitCode === null || execution.interrupted;
    const exitCode = interrupted ? -1 : (execution.exitCode ?? -1);

    const outcome = outcomeOf({
      commandCount: request.commandCount,
      exitCode,
      /* Whether the verifier ran, not whether it printed: a silent pass is
             ordinary, a verifier that never started voids the trial. */
      fingerprint: {
        verify:
          output.trim() === "" && execution.exitCode !== null
            ? `exited ${exitCode}`
            : output,
      },
      modelMs: request.modelMs,
      sandboxMs: 0,
      verifySteps: stepResultsOf(script, raw),
    });
    const validation: EvalValidation = {
      ...record,
      status:
        interrupted || outcome.status === "void"
          ? "error"
          : resultStatus(outcome.passed),
      durationMs: Math.max(0, (yield* Clock.currentTimeMillis) - started),
      exitCode: execution.exitCode,
      message: interrupted ? "Verifier did not report process exit" : "",
      output: capture({
        stdout: execution.stdout,
        stderr: execution.stderr,
        exitCode: execution.exitCode,
      }),
      truncated: execution.rawTruncated,
    };
    yield* publishValidation(validation, request.onValidation);
    return {
      ...outcome,
      validations: [validation],
      ...(interrupted
        ? { passed: false, status: "void" as const, voidFields: ["verify"] }
        : {}),
    };
  });

export const ScorerGroundTruthLive = Layer.succeed(
  Scorer,
  Scorer.of({
    score: (request: ScoreRequest) =>
      writeAnswer(request.sandbox, request.events).pipe(
        Effect.flatMap(() =>
          request.validator != null && "source" in request.validator
            ? scoreValidator({ ...request, validator: request.validator })
            : scoreCommand(request)
        ),
        Effect.withSpan("Scorer.score")
      ),
  })
);
