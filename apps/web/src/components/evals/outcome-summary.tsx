import { NOTHING } from "@/lib/evals/duration";

interface OutcomeSummaryProps {
  readonly passed: number;
  readonly scored: number;
  readonly voided: number;
}

export function OutcomeSummary({
  passed,
  scored,
  voided,
}: OutcomeSummaryProps) {
  return (
    <span className="flex items-center justify-end gap-1.5">
      <span className="tabular-nums">
        {scored === 0 ? NOTHING : `${passed}/${scored}`}
      </span>

      {voided > 0 ? <span className="text-warning">{voided} void</span> : null}
    </span>
  );
}

export function CommandSpread({
  max,
  min,
}: {
  readonly max: number | null;
  readonly min: number | null;
}) {
  if (min === null || max === null) {
    return <span className="tabular-nums">{NOTHING}</span>;
  }

  return (
    <span className="tabular-nums">
      {min === max ? min : `${min}-${max}`} cmds
    </span>
  );
}
