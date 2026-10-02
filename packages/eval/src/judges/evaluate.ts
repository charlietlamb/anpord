import type { EvalJudgment } from "@sphynx/schema/domain/eval-judges";
import {
  type EvalValidation,
  validationCapture,
  validationExecution,
} from "@sphynx/schema/domain/eval-validations";
import type { HarnessUsage } from "@sphynx/schema/domain/harness-event";
import { Clock, Effect, Schema } from "effect";
import { publishValidation } from "../adapters/scorers/validation";
import {
  type JudgeFile,
  judgeFileProblem,
  type ReadJudgeFile,
} from "../domain/judge-files";
import { JudgeFailed, JudgeModel, type JudgeRequest } from "./model";
import { judgmentSchema } from "./prompt";

type JudgeEvaluation = Omit<JudgeRequest, "files"> & {
  readonly files?: readonly JudgeFile[];
};

const readableFiles = (files: readonly JudgeFile[]) =>
  Effect.forEach(files, (file) =>
    file.kind === "read"
      ? Effect.succeed<ReadJudgeFile>(file)
      : Effect.fail(new JudgeFailed({ message: judgeFileProblem(file) }))
  );

export const evaluateJudge = ({ files = [], ...request }: JudgeEvaluation) =>
  Effect.gen(function* () {
    const model = yield* JudgeModel;
    const started = yield* Clock.currentTimeMillis;
    const capture = validationCapture(request.capture !== false);
    let record: EvalValidation = validationExecution(
      {
        id: `judge:${request.index ?? 0}`,
        index: request.index ?? 0,
        name: request.judge.name,
        kind: "judge",
      },
      started
    );
    yield* publishValidation(record, request.onValidation);
    let usage: HarnessUsage | undefined;
    const result = yield* readableFiles(files).pipe(
      Effect.flatMap((readable) =>
        model.complete({
          ...request,
          files: readable,
          onRequest: (input) =>
            Effect.gen(function* () {
              record = { ...record, input: capture(input) };
              yield* publishValidation(record, request.onValidation);
            }),
        })
      ),
      Effect.tap(({ text, ...metadata }) =>
        Effect.gen(function* () {
          usage = metadata.usage;
          record = {
            ...record,
            output: capture(text, "text"),
            metadata: capture(metadata),
          };
          yield* publishValidation(record, request.onValidation);
        })
      ),
      Effect.flatMap((response) =>
        Effect.gen(function* () {
          if (response.toolCalls?.length) {
            return yield* Effect.fail(
              new JudgeFailed({
                message:
                  "The judge used tools instead of scoring the supplied evidence",
              })
            );
          }
          if (response.refusal !== undefined || response.incomplete === true) {
            return yield* Effect.fail(
              new JudgeFailed({
                message:
                  response.refusal === undefined
                    ? "Judge response was incomplete"
                    : "Judge refused to score the evidence",
              })
            );
          }
          return yield* Schema.decodeUnknown(
            Schema.parseJson(judgmentSchema(request.judge.choices)),
            { onExcessProperty: "error" }
          )(response.text);
        })
      ),
      Effect.map(({ choice, reason }) => ({
        choice,
        reason,
        score: request.judge.choices[choice] ?? null,
        error: null,
      })),
      Effect.timeoutFail({
        duration: request.judge.timeoutMs,
        onTimeout: () => new JudgeFailed({ message: "Judge timed out" }),
      }),
      Effect.catchAll((error) =>
        Effect.succeed({
          choice: null,
          score: null,
          reason: "No valid judgment was produced",
          error:
            error._tag === "JudgeFailed"
              ? error.message
              : "Judge returned an invalid response",
        })
      )
    );
    const judgment = {
      ...result,
      name: request.judge.name,
      model: request.judge.model,
      evaluator:
        request.judge.harness === undefined
          ? request.judge.provider
          : request.judge.harness,
      threshold: request.judge.threshold,
      durationMs: (yield* Clock.currentTimeMillis) - started,
      usage,
    } satisfies EvalJudgment;
    const passed =
      judgment.score !== null && judgment.score >= judgment.threshold;
    const status = passed ? "passed" : "failed";
    record = {
      ...record,
      status: judgment.error === null ? status : "error",
      durationMs: judgment.durationMs,
      message: (judgment.error ?? judgment.reason).slice(0, 2000),
      error: judgment.error === null ? null : capture(judgment.error, "text"),
      judgment,
    };
    yield* publishValidation(record, request.onValidation);
    return judgment;
  }).pipe(Effect.withSpan("Judge.evaluate"));
