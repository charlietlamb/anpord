import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { ValidationValue } from "@/components/evals/validation-value";

const rowsOf = (validation: EvalValidation) => [
  { label: "Invocation input", value: validation.input },
  ...(validation.judgment
    ? [{ label: "Raw response", value: validation.output }]
    : []),
  ...(validation.metadata
    ? [{ label: "Provider metadata", value: validation.metadata }]
    : []),
  ...validation.logs.map((log) => ({
    label: `${log.level} · ${new Date(log.at).toISOString()} · ${log.index + 1}`,
    value: log.value,
  })),
];

export function ValidationExecution({
  validation,
}: {
  readonly validation: EvalValidation;
}) {
  return (
    <div className="min-w-0 space-y-1">
      {rowsOf(validation).map(({ label, value }) => (
        <ValidationValue
          disclosure
          key={label}
          label={label}
          open={false}
          value={value}
        />
      ))}
    </div>
  );
}
