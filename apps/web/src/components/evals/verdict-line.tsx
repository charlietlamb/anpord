import type { EvalComparison } from "@anpord/schema/domain/evals";
import { VerdictBadge } from "@/components/evals/eval-status-badge";

/**
 * Whether this cell moved, and what a rate alone cannot say.
 *
 * The empty branch is now the first run of a cell rather than a cell nobody
 * promoted: a reading becomes the reference as the grid records it, so there
 * is nothing here for a person to do.
 */
export function VerdictLine({
  comparison,
}: {
  readonly comparison: EvalComparison | null;
}) {
  if (comparison === null) {
    return (
      <p className="text-muted-foreground text-xs">
        First reading of this cell, so there is nothing to compare it with yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
      <VerdictBadge delta={comparison.delta} verdict={comparison.verdict} />

      {comparison.verdict === "incomparable" && comparison.reason !== null ? (
        <span className="text-pretty">{comparison.reason}</span>
      ) : null}
    </div>
  );
}
