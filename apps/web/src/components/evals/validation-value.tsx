import type { ValidationValue as Captured } from "@anpord/schema/domain/eval-validations";
import type { ComponentProps } from "react";
import { EvidenceValue } from "@/components/evals/evidence-value";

export function ValidationValue({
  value,
  ...props
}: Omit<ComponentProps<typeof EvidenceValue>, "value"> & {
  readonly value: Captured;
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
