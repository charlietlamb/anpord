import { PassArc } from "@/components/evals/pass-arc";
import { SignalTip } from "@/components/evals/signal-tip";
import { NOTHING } from "@/lib/evals/duration";

interface OutcomeSummaryProps {
  readonly passed: number;
  readonly scored: number;
  readonly voided: number;
}

const outcomeLabel = ({ passed, scored, voided }: OutcomeSummaryProps) => {
  if (scored === 0) {
    return voided > 0
      ? `${voided} trials ended without a result`
      : "Nothing scored yet";
  }

  const scoredPart = `${passed} of ${scored} scored trials passed`;

  return voided > 0
    ? `${scoredPart} · ${voided} ended without a result`
    : scoredPart;
};

export function OutcomeSummary(props: OutcomeSummaryProps) {
  const { passed, scored, voided } = props;

  if (scored + voided === 0) {
    return (
      <span className="text-muted-foreground tabular-nums">{NOTHING}</span>
    );
  }

  return (
    <SignalTip
      className="flex items-center justify-end"
      label={outcomeLabel(props)}
    >
      <PassArc passed={passed} scored={scored} voided={voided} />
    </SignalTip>
  );
}
