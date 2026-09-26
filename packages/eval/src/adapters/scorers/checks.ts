import type { TrialOutcome } from "@anpord/schema/domain/trial";
import { Effect, Layer } from "effect";
import { outcomeOf } from "../../domain/trial";
import { Scorer } from "../../ports/scorer";

const combineOutcomes = (
  outcomes: readonly TrialOutcome[],
  unchecked: TrialOutcome
): TrialOutcome => {
  const deciding =
    outcomes.find((outcome) => outcome.status === "void") ??
    outcomes.find((outcome) => outcome.status !== "passed") ??
    outcomes.at(-1) ??
    unchecked;
  return {
    ...deciding,
    validations: outcomes.flatMap((outcome) => outcome.validations ?? []),
    voidFields: outcomes.flatMap((outcome) => outcome.voidFields),
  };
};

export const ScorerChecksLive = Layer.effect(
  Scorer,
  Effect.gen(function* () {
    const scorer = yield* Scorer;
    return Scorer.of({
      score: (request) =>
        Effect.gen(function* () {
          if (request.validator == null || "source" in request.validator) {
            return yield* scorer.score(request);
          }
          const { checks } = request.validator;
          const outcomes = yield* Effect.forEach(checks, (validator, index) =>
            scorer.score({
              ...request,
              validator,
              validationPrefix: checks.length > 1 ? `group:${index}:` : "",
            })
          );
          return combineOutcomes(
            outcomes,
            outcomeOf({
              commandCount: request.commandCount,
              exitCode: 0,
              fingerprint: { validation: "Judgment required" },
              modelMs: request.modelMs,
              sandboxMs: 0,
            })
          );
        }).pipe(Effect.withSpan("ScorerChecks.score")),
    });
  })
);
