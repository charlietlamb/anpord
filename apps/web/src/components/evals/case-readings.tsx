import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";
import { HistoryRow } from "@/components/evals/history-row";
import { EmptyNote } from "@/components/layout/empty-note";

const definitionChangedAfter = (
  entries: readonly EvalCellHistoryEntry[],
  index: number
) => {
  const earlier = entries[index + 1];

  return (
    earlier !== undefined &&
    earlier.definitionHash !== entries[index]?.definitionHash
  );
};

export function CaseReadings({
  cellKey,
  entries,
}: {
  readonly cellKey: string;
  readonly entries: readonly EvalCellHistoryEntry[];
}) {
  if (entries.length === 0) {
    return <EmptyNote>No runs of this case yet.</EmptyNote>;
  }

  return (
    <ul className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.internalId}>
          <HistoryRow cellKey={cellKey} entry={entry} />

          {definitionChangedAfter(entries, index) ? (
            <p className="flex items-center gap-2 py-1.5 text-muted-foreground text-xs">
              <span className="h-px flex-1 bg-border-faint" />
              The case was edited here
              <span className="h-px flex-1 bg-border-faint" />
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
