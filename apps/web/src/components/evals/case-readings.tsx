import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";
import { Link } from "@tanstack/react-router";
import { historyResult } from "@/lib/evals/cell-history";
import { clock } from "@/lib/evals/duration";
import { shortId } from "@/lib/evals/short-id";

const editedAt = (
  entries: readonly EvalCellHistoryEntry[],
  index: number
): boolean => {
  const next = entries[index + 1];

  return (
    next !== undefined && next.definitionHash !== entries[index]?.definitionHash
  );
};

export function CaseReadings({
  cellKey,
  entries,
}: {
  readonly cellKey: string;
  readonly entries: readonly EvalCellHistoryEntry[];
}) {
  return (
    <ul className="flex flex-col">
      {entries.map((entry, index) => {
        const result = historyResult(entry);

        return (
          <li key={entry.internalId}>
            <Link
              className="-mx-2 flex items-baseline justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-surface hover:bg-alpha-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              params={{ cellKey, runId: entry.runId }}
              to="/evals/$runId/cells/$cellKey"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate whitespace-nowrap">
                  {entry.finishedAt === null
                    ? `Run ${shortId(entry.runId)}`
                    : clock(entry.finishedAt.epochMillis)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {entry.harnessVersion}
                </span>
              </span>

              <span className={`${result.className} whitespace-nowrap text-xs`}>
                {result.label}
              </span>
            </Link>

            {editedAt(entries, index) ? (
              <p className="flex items-center gap-2 py-1.5 text-muted-foreground text-xs">
                <span className="h-px flex-1 bg-border-faint" />
                the case was edited here
                <span className="h-px flex-1 bg-border-faint" />
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
