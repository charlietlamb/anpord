import type { EvalComparison } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import { verdictMark } from "@/lib/evals/eval-status";

const TONE_CLASSES = {
  critical: "text-destructive",
  muted: "text-muted-foreground",
  positive: "text-success",
  warning: "text-warning",
} as const;

const MOVED = new Set(["improved", "regressed"]);

const signed = (delta: number) => `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`;

export function CellVerdict({
  comparison,
}: {
  readonly comparison: EvalComparison;
}) {
  const mark = verdictMark(comparison.verdict);
  const moved = MOVED.has(comparison.verdict);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "flex items-center gap-1 tabular-nums",
              TONE_CLASSES[mark.tone]
            )}
          >
            <mark.Icon aria-hidden="true" className="size-3.5 shrink-0" />
            {moved ? signed(comparison.delta) : null}
            <span className="sr-only">{comparison.verdict}</span>
          </span>
        }
      />

      <TooltipContent side="left">
        {comparison.verdict}
        {comparison.reason === null ? null : `: ${comparison.reason}`}
      </TooltipContent>
    </Tooltip>
  );
}
