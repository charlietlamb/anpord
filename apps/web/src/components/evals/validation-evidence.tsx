import type {
  EvalValidation,
  ValidationValue,
} from "@anpord/schema/domain/eval-validations";
import type { ComponentProps } from "react";
import { EvidenceValue } from "@/components/evals/evidence-value";
import { seconds } from "@/lib/evals/duration";
import { judgeInput } from "@/lib/evals/validation-results";

export function Value({
  value,
  ...props
}: Omit<ComponentProps<typeof EvidenceValue>, "value"> & {
  readonly value: ValidationValue;
}) {
  return (
    <EvidenceValue
      {...props}
      truncated={value.state === "captured" && value.truncated}
      unavailable={
        value.state === "disabled" ? "Capture disabled" : "Not recorded"
      }
      value={value.state === "captured" ? value.text : undefined}
    />
  );
}

export function ReadEvidence({
  validation,
}: {
  readonly validation: EvalValidation;
}) {
  const fields =
    validation.kind === "judge" ? judgeInput(validation.input) : null;
  if (fields) {
    return fields.map(({ label, value }, index) =>
      index === 0 ? (
        <dl key={label}>
          <EvidenceValue label={label} value={value} />
        </dl>
      ) : (
        <EvidenceValue disclosure key={label} label={label} value={value} />
      )
    );
  }
  if (validation.kind === "code") {
    if (validation.calls.length === 0) {
      return (
        <p className="py-2 text-muted-foreground text-xs">
          {validation.input.state === "disabled"
            ? "Capture disabled"
            : "No context reads recorded"}
        </p>
      );
    }
    return validation.calls.map((call, index) => (
      <Value
        disclosure
        key={call.index}
        label={`${call.method}() · ${call.durationMs === null ? "Incomplete" : seconds(call.durationMs)}`}
        open={index === 0}
        value={call.output}
      >
        {call.error ? (
          <dl>
            <Value label="Error" value={call.error} />
          </dl>
        ) : null}
        <Value disclosure label="Arguments" value={call.input} />
      </Value>
    ));
  }

  return (
    <dl>
      <Value
        label={validation.kind === "judge" ? "Request" : "Invocation input"}
        value={validation.input}
      />
    </dl>
  );
}
