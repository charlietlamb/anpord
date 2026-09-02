import { TrialRow } from "@/components/evals/trial-row";
import { EmptyNote } from "@/components/layout/empty-note";
import { RowList } from "@/components/layout/row-list";
import { shortId } from "@/lib/evals/short-id";
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
  currentRunId,
  readings,
}: {
  readonly cellKey: string;
  readonly currentRunId: string;
  readonly readings: readonly Reading[];
}) {
  const rows = trialRowsOf(readings);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <p className="px-2 font-medium text-label text-muted-foreground">
          Trials
        </p>
        <EmptyNote>This cell has recorded no trials.</EmptyNote>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 font-medium text-label text-muted-foreground">
        Trials
      </p>

      <RowList label="Trials">
        {rows.map((row) => (
          <div className="contents" key={row.key}>
            {row.runId !== null && row.runIdFull !== currentRunId ? (
              <p className="px-2 pt-2 text-muted-foreground text-xs tabular-nums">
                Run {shortId(row.runIdFull)}
              </p>
            ) : null}

            <TrialRow
              cellKey={cellKey}
              runId={row.runIdFull}
              trial={row.trial}
            />
          </div>
        ))}
      </RowList>
    </div>
  );
}
