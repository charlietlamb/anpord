import type { EvalJudgment } from "@anpord/schema/domain/eval-judges";
import { Clock, Effect, Schema } from "effect";
import { JudgeFailed, JudgeModel, type JudgeRequest } from "./model";
import { judgmentSchema } from "./prompt";

export const evaluateJudge = (request: JudgeRequest) =>
  Effect.gen(function* () {
    const model = yield* JudgeModel;
    const started = yield* Clock.currentTimeMillis;
    const result = yield* model.complete(request).pipe(
      Effect.flatMap(
        Schema.decodeUnknown(
          Schema.parseJson(judgmentSchema(request.judge.choices)),
          { onExcessProperty: "error" }
        )
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
    return {
      ...result,
      name: request.judge.name,
      model: request.judge.model,
      evaluator:
        request.judge.harness === undefined
          ? request.judge.provider
          : request.judge.harness,
      threshold: request.judge.threshold,
      durationMs: (yield* Clock.currentTimeMillis) - started,
    } satisfies EvalJudgment;
  }).pipe(Effect.withSpan("Judge.evaluate"));
