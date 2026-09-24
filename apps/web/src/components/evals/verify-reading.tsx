import type { StepReading } from "@anpord/schema/domain/verify-steps";
import { InlineCode } from "@anpord/ui/components/ui/inline-code";

export function VerifyReading({
  reading,
  step,
}: {
  readonly reading: StepReading;
  readonly step: string;
}) {
  if (reading.kind === "command") {
    return (
      <span className="block truncate" title={step}>
        <InlineCode>{reading.text}</InlineCode>
      </span>
    );
  }

  return (
    <span className="truncate" title={step}>
      {reading.kind === "message" ? (
        <span className="mr-1.5 text-muted-foreground">throws</span>
      ) : null}
      {reading.text}
    </span>
  );
}
