import { TrialRow } from "@/components/evals/trial-row";
import { EmptyNote } from "@/components/layout/empty-note";
import { RowList } from "@/components/layout/row-list";
import type { Reading } from "@/lib/evals/trial-rows";
import { trialRowsOf } from "@/lib/evals/trial-rows";

/**
 * Every trial this cell has ever recorded, newest reading first.
 *
 * One list rather than one page per reading. A cell holds the same case, setup
 * and variant on every repeat, because the cell key hashes all three, so the
 * trials are the only thing that differs between readings -- and reading nine
 * of them meant opening nine pages that differed in their numbers alone.
 */
export function TrialTable({
  cellKey,
  readings,
}: {
  readonly cellKey: string;
  readonly readings: readonly Reading[];
}) {
  const rows = trialRowsOf(readings);

  if (rows.length === 0) {
    return <EmptyNote>This cell has recorded no trials.</EmptyNote>;
  }

  return (
    <RowList>
      {rows.map((row) => (
        <TrialRow
          cellKey={cellKey}
          key={row.key}
          runId={row.runIdFull}
          showRun={row.runId !== null}
          trial={row.trial}
        />
      ))}
    </RowList>
  );
}
