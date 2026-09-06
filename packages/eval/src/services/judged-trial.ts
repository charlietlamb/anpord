import { Effect, Layer } from "effect";
import { answerOf } from "../domain/journal";
import { evaluateJudge } from "../judges/evaluate";
import { JudgeModel } from "../judges/model";
import { AgentTrial, type AgentTrialResult } from "./agent-trial";

export const AgentTrialJudgedLive = Layer.effect(
  AgentTrial,
  Effect.gen(function* () {
    const trial = yield* AgentTrial;
    const model = yield* JudgeModel;
    return AgentTrial.of({
      run: (request) =>
        Effect.gen(function* () {
          const result = yield* trial.run(request);
          if (
            request.validator == null ||
            "source" in request.validator ||
            result.outcome.status === "void"
          ) {
            return result;
          }
          const judgments = yield* Effect.forEach(
            request.validator.judges,
            (judge) =>
              evaluateJudge({
                judge,
                context: request,
                input: request.prompt,
                output: answerOf(result.events),
              })
          );
          const invalid = judgments.filter(({ error }) => error !== null);
          const passed =
            result.outcome.passed &&
            judgments.every(
              ({ score, threshold }) => score !== null && score >= threshold
            );
          const verdict = passed
            ? ({ status: "passed", exitCode: 0 } as const)
            : ({ status: "failed", exitCode: 1 } as const);
          return {
            ...result,
            outcome: {
              ...result.outcome,
              judgments,
              passed,
              ...verdict,
              ...(invalid.length > 0
                ? { status: "void" as const, exitCode: -1 }
                : {}),
              voidFields: [
                ...result.outcome.voidFields,
                ...invalid.map(({ name }) => `judge:${name}`),
              ],
            },
          } satisfies AgentTrialResult;
        }).pipe(
          Effect.provideService(JudgeModel, model),
          Effect.withSpan("JudgedTrial.run")
        ),
    });
  })
);
