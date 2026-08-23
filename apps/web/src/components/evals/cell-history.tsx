import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReadingTone } from "@/lib/evals/cell-history";
import { readingsOf, summaryOf } from "@/lib/evals/cell-history";
import { evalQueries } from "@/lib/evals/eval-queries";

const TONE_CLASSES: Record<ReadingTone, string> = {
  critical: "bg-destructive/70 hover:bg-destructive",
  pending: "bg-muted-foreground/25 hover:bg-muted-foreground/40",
  positive: "bg-success/70 hover:bg-success",
  running: "border border-warning/50 border-dashed bg-transparent",
};

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

  const readings = readingsOf(entries);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-[3px]">
        {readings.map((reading) => (
          <Tooltip key={reading.entry.internalId}>
            <TooltipTrigger
              render={
                <Link
                  className={cn(
                    "h-4 min-w-[3px] flex-1 rounded-[2px] transition-colors duration-150 ease-out",
                    TONE_CLASSES[reading.tone]
                  )}
                  params={{ cellKey, runId: reading.entry.runId }}
                  to="/evals/$runId/cells/$cellKey"
                >
                  <span className="sr-only">{reading.title}</span>
                </Link>
              }
            />

            <TooltipContent side="left">{reading.title}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <p className="text-pretty text-muted-foreground text-xs">
        {summaryOf(readings)}
      </p>
    </div>
  );
}
