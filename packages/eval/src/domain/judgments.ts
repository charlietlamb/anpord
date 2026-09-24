import type { EvalJudgment } from "@anpord/schema/domain/eval-judges";
import type { EvalValidation } from "@anpord/schema/domain/eval-validations";

export const judgmentsIn = (
  validations: readonly EvalValidation[]
): readonly EvalJudgment[] =>
  validations.flatMap((validation) =>
    validation.judgment === undefined || validation.judgment === null
      ? []
      : [validation.judgment]
  );
