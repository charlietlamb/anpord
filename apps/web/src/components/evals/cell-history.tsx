import { Skeleton } from "@anpord/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { historyResult } from "@/lib/evals/cell-history";
import { clock } from "@/lib/evals/duration";
import { evalQueries } from "@/lib/evals/eval-queries";
import { shortId } from "@/lib/evals/short-id";

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
      {data.slice(0, 5).map((entry) => {
        const result = historyResult(entry);
        const current = entry.runId === runId;
        return (
          <li key={entry.internalId}>
            <Link
              aria-current={current ? "page" : undefined}
              className="-mx-2 flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              params={{ cellKey, runId: entry.runId }}
              to="/evals/$runId/cells/$cellKey"
            >
              <span className="flex flex-col gap-0.5">
                <span className="whitespace-nowrap">
                  {entry.finishedAt === null
                    ? `Run ${shortId(entry.runId)}`
                    : clock(entry.finishedAt.epochMillis)}
                </span>
                {current ? (
                  <span className="text-muted-foreground">Current</span>
                ) : null}
              </span>
              <span className={result.className}>{result.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
