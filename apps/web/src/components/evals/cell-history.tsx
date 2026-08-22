import { useQuery } from "@tanstack/react-query";
import { OutcomeSummary } from "@/components/evals/outcome-summary";
import { dayOf } from "@/lib/evals/duration";
import { evalQueries } from "@/lib/evals/eval-queries";

/**
 * How this cell has read over time, newest first.
 *
 * What turns `unchanged` into `unchanged since 14 Aug`: a verdict says which
 * way a cell moved, and only its history says when it last did.
 */
export function CellHistory({ cellKey }: { readonly cellKey: string }) {
  const { data, isPending } = useQuery(evalQueries.history(cellKey));
  const entries = data ?? [];

  if (isPending) {
    return null;
  }

  if (entries.length <= 1) {
    return (
      <p className="text-muted-foreground text-xs">
        No earlier readings of this cell.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-medium text-muted-foreground text-xs">History</h2>

      <ul className="flex flex-col">
        {entries.map((entry) => (
          <li
            className="flex items-center gap-4 border-border-faint border-b py-1.5 text-xs last:border-0"
            key={entry.internalId}
          >
            <span className="w-14 text-muted-foreground tabular-nums">
              {entry.finishedAt === null
                ? "running"
                : dayOf(entry.finishedAt.epochMillis)}
            </span>

            <OutcomeSummary
              passed={entry.distribution.passed}
              scored={entry.distribution.scored}
              voided={entry.distribution.voided}
            />

            <span className="ml-auto font-mono text-muted-foreground/60">
              {entry.runId}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
