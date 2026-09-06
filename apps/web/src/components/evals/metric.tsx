import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { METRICS, type MetricName } from "@/lib/evals/metrics";

export function Metric({
  children,
  className,
  hint,
  name,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  /* Overrides the metric's own hint, for a screen that aggregates it. */
  readonly hint?: string;
  readonly name: MetricName;
}) {
  const own = METRICS[name];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex items-center justify-end gap-1.5 tabular-nums",
              className
            )}
          >
            <own.Icon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground/60"
            />
            <span className="sr-only">{own.label}</span>
            {children}
          </span>
        }
      />

      <TooltipContent side="top">
        <span className="font-medium">{own.label}</span>
        <span className="opacity-70"> · {hint ?? own.hint}</span>
      </TooltipContent>
    </Tooltip>
  );
}
