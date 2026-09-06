import { Effect, Layer } from "effect";
import { outcomeOf } from "../../domain/trial";
import { Scorer } from "../../ports/scorer";

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
          let outcome = outcomeOf({
            commandCount: request.commandCount,
            exitCode: 0,
            fingerprint: { validation: "Judgment required" },
            modelMs: request.modelMs,
            sandboxMs: 0,
          });
          for (const validator of request.validator.checks) {
            outcome = yield* scorer.score({ ...request, validator });
            if (!outcome.passed) {
              break;
            }
          }
          return outcome;
        }).pipe(Effect.withSpan("ScorerChecks.score")),
    });
  })
);
