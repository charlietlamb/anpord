import type { EvalValidation } from "@sphynx/schema/domain/eval-validations";
import { ValidationJudgment } from "@/components/evals/validation-judgment";
import { ValidationValue } from "@/components/evals/validation-value";

export function ValidationResult({
  validation,
}: {
  readonly validation: EvalValidation;
}) {
  return (
    <div className="min-w-0">
      {validation.judgment ? (
        <ValidationJudgment judgment={validation.judgment} />
      ) : (
        <dl>
          <ValidationValue label="Return value" value={validation.output} />
        </dl>
      )}

      {validation.error ? (
        <dl>
          <ValidationValue label="Error" value={validation.error} />
        </dl>
      ) : null}
    </div>
  );
}
