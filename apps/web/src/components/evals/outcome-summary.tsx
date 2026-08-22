import { Badge } from "@anpord/ui/components/ui/badge";

const NOTHING = "·";

interface OutcomeSummaryProps {
  readonly passed: number;
  readonly scored: number;
  readonly voided: number;
}

/**
 * How a reading is stated: a fraction, never a percentage.
 *
 * A rate without its denominator is how a provider outage reads as a perfect
 * score, and 450 void trials in this database say that is not hypothetical.
 * Nothing scored renders as a dot rather than zero, because a run that
 * measured nothing has not scored zero.
 */
export function OutcomeSummary({
  passed,
  scored,
  voided,
}: OutcomeSummaryProps) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="tabular-nums">
        {scored === 0 ? NOTHING : `${passed}/${scored}`}
      </span>

      {voided > 0 ? (
        <Badge
          className="border-warning/25 bg-warning/10 font-medium text-warning"
          size="xs"
          variant="outline"
        >
          {voided} void
        </Badge>
      ) : null}
    </span>
  );
}

/**
 * The command spread.
 *
 * Travels with the rate because ten of ten in nine to eleven commands and
 * seven of ten in nine to forty-one are different findings, and a rate alone
 * cannot tell them apart.
 */
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
