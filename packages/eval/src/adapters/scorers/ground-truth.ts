import {
  type EvalValidation,
  validationCapture,
  validationExecution,
  validationSnapshot,
} from "@anpord/schema/domain/eval-validations";
import type { EvalCodeValidator } from "@anpord/schema/domain/evals";
import { Clock, Effect, Layer, Random } from "effect";
import { outcomeOf } from "../../domain/trial";
import {
  stepResultsOf,
  verifyScriptOf,
  withoutMarks,
} from "../../domain/verify-script";
import {
  type ScoreRequest,
  Scorer,
  type ScorerShape,
} from "../../ports/scorer";
import { isUnguardedPipeline, quoted } from "./shell-pipeline";
import { executeValidation, publishValidation } from "./validation";
import { completeValidations, legacyValidation } from "./validation-records";
import {
  answerEnv,
  processError,
  resultStatus,
  writeAnswer,
} from "./validator-protocol";

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
          ...request.env,
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
      execution.stderr ? capture(execution.stderr, "text") : null,
      execution.exitCode
    );
    const failed = validations.some((record) => record.status === "failed");
    const invalid =
      validations.some((record) => record.status === "error") ||
      processError(execution) !== null;
    for (const record of validations) {
      yield* publishValidation(record, request.onValidation);
    }
    return {
      artifacts: [],
      commandCount: request.commandCount,
      modelMs: request.modelMs,
      sandboxMs: 0,
      exitCode: invalid ? execution.exitCode || -1 : Number(failed),
      status: invalid ? ("void" as const) : resultStatus(!failed),
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
        env: { ...request.env, ...answerEnv(request.sandbox) },
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
    const validation = validationSnapshot({
      ...record,
      status:
        interrupted || outcome.status === "void"
          ? "error"
          : resultStatus(outcome.status === "passed"),
      durationMs: Math.max(0, (yield* Clock.currentTimeMillis) - started),
      exitCode: execution.exitCode,
      message: interrupted ? "Verifier did not report process exit" : "",
      output: capture({
        stdout: execution.stdout,
        stderr: execution.stderr,
        exitCode: execution.exitCode,
      }),
      truncated: execution.rawTruncated,
    });
    yield* publishValidation(validation, request.onValidation);
    return {
      ...outcome,
      validations: [validation],
      ...(interrupted
        ? { status: "void" as const, voidFields: ["verify"] }
        : {}),
    };
  });

export const ScorerGroundTruthLive = Layer.succeed(
  Scorer,
  Scorer.of({
    score: (request: ScoreRequest) =>
      writeAnswer(request.sandbox, request.events, request.turns).pipe(
        Effect.flatMap(() =>
          request.validator != null && "source" in request.validator
            ? scoreValidator({ ...request, validator: request.validator })
            : scoreCommand(request)
        ),
        Effect.withSpan("Scorer.score")
      ),
  })
);
