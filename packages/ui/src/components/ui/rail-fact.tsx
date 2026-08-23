import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import type { ComponentType, ReactNode } from "react";

export type RailIcon = ComponentType<{ readonly className?: string }>;

interface RailFactProps {
  readonly detail?: ReactNode;
  readonly hint?: ReactNode;
  readonly Icon?: RailIcon;
  readonly label: string;
  readonly layout?: "spread" | "stated";
  readonly tone?: "critical" | "muted" | "positive" | "warning";
  readonly value: ReactNode;
}

export function RailFact({
  detail,
  hint,
  Icon,
  label,
  layout = "spread",
  tone,
  value,
}: RailFactProps) {
  const stated = layout === "stated";

  const row = (
    <div
      aria-label={stated ? label : undefined}
      className={cn(
        "flex h-6 items-center gap-2 rounded-sm text-xs",
        Icon === undefined && !stated && "pl-[1.375rem]",
        hint !== undefined &&
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      )}
      role={hint === undefined ? undefined : "note"}
      tabIndex={hint === undefined ? undefined : 0}
    >
      {Icon === undefined ? null : (
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "critical" && "text-destructive",
            tone === "warning" && "text-warning",
            tone === "positive" && "text-success",
            (tone === undefined || tone === "muted") &&
              "text-muted-foreground/80"
          )}
        />
      )}

      {stated ? null : (
        <span className="shrink-0 text-muted-foreground/80">{label}</span>
      )}

      {stated ? null : detail}

      <span
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums",
          stated ? "text-foreground" : "ml-auto",
          tone === "warning" && "text-warning",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value}
      </span>

      {stated ? detail : null}
    </div>
  );

  if (hint === undefined) {
    return row;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={row} />
      <TooltipContent className="max-w-72" side="left">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
