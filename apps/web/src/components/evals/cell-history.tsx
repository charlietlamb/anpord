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
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <li
          className="flex h-6 items-center gap-3 text-xs"
          key={entry.internalId}
        >
          <span className="shrink-0 text-muted-foreground/80 tabular-nums">
            {entry.finishedAt === null
              ? "running"
              : dayOf(entry.finishedAt.epochMillis)}
          </span>

          <OutcomeSummary
            passed={entry.distribution.passed}
            scored={entry.distribution.scored}
            voided={entry.distribution.voided}
          />
        </li>
      ))}
    </ul>
  );
}
