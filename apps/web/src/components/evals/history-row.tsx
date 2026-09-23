import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { historyResult } from "@/lib/evals/cell-history";
import { clock } from "@/lib/evals/duration";
import { shortId } from "@/lib/evals/short-id";

export function HistoryRow({
  cellKey,
  current = false,
  dense = false,
  entry,
}: {
  readonly cellKey: string;
  readonly current?: boolean;
  readonly dense?: boolean;
  readonly entry: EvalCellHistoryEntry;
}) {
  const result = historyResult(entry);

  return (
    <Link
      aria-current={current ? "page" : undefined}
      className={cn(
        "-mx-2 flex items-baseline justify-between gap-3 rounded-lg px-2 transition-surface hover:bg-alpha-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        dense ? "py-1.5 text-xs" : "py-2 text-sm"
      )}
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
          {current ? "Current" : entry.harnessVersion}
        </span>
      </span>

      <span className={cn(result.className, "whitespace-nowrap text-xs")}>
        {result.label}
      </span>
    </Link>
  );
}
