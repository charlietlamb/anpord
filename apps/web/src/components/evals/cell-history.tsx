import { Skeleton } from "@anpord/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { HistoryRow } from "@/components/evals/history-row";
import { evalQueries } from "@/lib/evals/eval-queries";

export function CellHistory({
  cellKey,
  quiet = false,
  runId,
}: {
  readonly cellKey: string;
  /** Set while the page around this is still a skeleton: a failure there is
   * the page's to report once it has loaded, not a message to raise beside
   * placeholders that have not resolved either. */
  readonly quiet?: boolean;
  readonly runId: string;
}) {
  const { data, isPending, error } = useQuery(evalQueries.history(cellKey));

  if (error) {
    return quiet ? (
      <Skeleton className="h-6 w-full" />
    ) : (
      <p className="text-muted-foreground text-xs">
        Could not load recent runs.
      </p>
    );
  }
  if (isPending) {
    return <Skeleton className="h-6 w-full" />;
  }
  if (data.length <= 1) {
    return quiet ? (
      <Skeleton className="h-6 w-full" />
    ) : (
      <p className="text-muted-foreground text-xs">No previous runs.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {data.slice(0, 5).map((entry) => (
        <li key={entry.internalId}>
          <HistoryRow
            cellKey={cellKey}
            current={entry.runId === runId}
            dense
            entry={entry}
          />
        </li>
      ))}
    </ul>
  );
}
