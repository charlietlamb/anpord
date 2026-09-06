import {
  type EvalValidation,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import { Effect, Layer } from "effect";
import { publishValidation } from "../adapters/scorers/validation";
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
          if (request.validator == null || "source" in request.validator) {
            return result;
          }
          const validations = new Map(
            (result.outcome.validations ?? []).map((record) => [
              record.id,
              record,
            ])
          );
          const observe = (record: EvalValidation) =>
            Effect.gen(function* () {
              validations.set(record.id, record);
              if (request.onValidation) {
                yield* request.onValidation(record);
              }
            });
          if (result.outcome.status === "void") {
            for (const [index, judge] of request.validator.judges.entries()) {
              yield* publishValidation(
                {
                  ...validationExecution(
                    {
                      id: `judge:${index}`,
                      index,
                      name: judge.name,
                      kind: "judge",
                    },
                    null
                  ),
                  message: "The trial did not produce valid evidence",
                },
                observe
              );
            }
            return {
              ...result,
              outcome: {
                ...result.outcome,
                validations: [...validations.values()],
              },
            };
          }
          const judgments = yield* Effect.forEach(
            request.validator.judges,
            (judge, index) =>
              evaluateJudge({
                index,
                onValidation: observe,
                capture: request.validator?.capture !== false,
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
              validations: [...validations.values()],
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
