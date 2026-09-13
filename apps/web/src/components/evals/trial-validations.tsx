import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { ValidationRow } from "@/components/evals/validation-row";
import { validationKey } from "@/lib/evals/validation-results";

export function TrialValidations({
  validations,
  expandedKey,
  onCollapse,
}: {
  readonly expandedKey?: string | null;
  readonly onCollapse?: () => void;
  readonly validations?: readonly EvalValidation[];
}) {
  if (!validations?.length) {
    return (
      <p className="py-3 text-muted-foreground text-xs">
        Execution evidence was not recorded for this trial.
      </p>
    );
  }
  const first = validations.find((validation) =>
    expandedKey
      ? validationKey(validation) === expandedKey
      : validation.status === "failed" || validation.status === "error"
  );
  return (
    <div className="space-y-3">
      {validations.map((validation) => (
        <ValidationRow
          expanded={validation === first}
          key={validation.id}
          onCollapse={validation === first ? onCollapse : undefined}
          validation={validation}
        />
      ))}
    </div>
  );
}
