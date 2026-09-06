import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import type { EvalCodeValidator } from "@anpord/schema/domain/evals";
import { Effect, Layer } from "effect";
import { outcomeOf } from "../../domain/trial";
import { validationPlan } from "../../domain/validation-plan";
import { Scorer } from "../../ports/scorer";
import { publishValidation } from "./validation";

const skippedChecks = (
  validator: typeof EvalCodeValidator.Type,
  prefix: string
): readonly EvalValidation[] =>
  validationPlan(validator, null).map((check) => ({
    ...check,
    id: `${prefix}${check.id}`,
    status: "skipped",
    message: "An earlier code validator did not pass",
  }));

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
          const validations: EvalValidation[] = [];
          for (const [index, validator] of request.validator.checks.entries()) {
            const prefix =
              request.validator.checks.length > 1 ? `group:${index}:` : "";
            if (!outcome.passed) {
              const skipped = skippedChecks(validator, prefix);
              validations.push(...skipped);
              yield* Effect.forEach(
                skipped,
                (record) => publishValidation(record, request.onValidation),
                { discard: true }
              );
              continue;
            }
            outcome = yield* scorer.score({
              ...request,
              validator,
              validationPrefix: prefix,
            });
            validations.push(...(outcome.validations ?? []));
          }
          return { ...outcome, validations };
        }).pipe(Effect.withSpan("ScorerChecks.score")),
    });
  })
);
