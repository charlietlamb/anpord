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

/**
 * How a run turned out.
 *
 * The arc alone, because it already carries the proportion and the exact
 * counts sit a hover away: `8/9` beside a nine-tenths ring is the same fact
 * told twice, and the digits are the copy that costs a column.
 *
 * It is drawn against every trial attempted, not every trial scored. A run
 * where 5 passed and 4 returned nothing is five ninths of a ring, and closing
 * it would claim a perfect run out of one that mostly failed to answer. A run
 * that scored nothing at all is then simply a grey one -- the shape says it
 * without a word, and reading it back as "9 void" put text in a column of
 * rings for the one case that needed it least.
 */
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
