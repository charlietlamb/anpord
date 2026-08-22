import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/**
 * One labelled fact in a rail: what it is on the left, what it reads on the
 * right.
 *
 * Shared because three rails had each grown their own, and a run that lists
 * its provider as a row while a cell lists the same provider as a badge reads
 * as two different screens.
 *
 * An indented row (no icon) is part of the row above it, which is how the
 * time breakdown says that thinking sits inside the agent phase rather than
 * beside it.
 */
export function RailFact({
  detail,
  hint,
  Icon,
  label,
  tone,
  value,
}: {
  /** Drawn between the label and the value, for a share bar or a badge. */
  readonly detail?: ReactNode;
  /** What the number means, for a label too short to say it. */
  readonly hint?: string;
  readonly Icon?: Icon;
  readonly label: string;
  readonly tone?: "muted" | "warning";
  readonly value: ReactNode;
}) {
  const row = (
    <div
      className={cn(
        "flex h-6 items-center gap-2 text-xs",
        Icon === undefined && "pl-[1.375rem]",
        hint !== undefined && "cursor-help"
      )}
    >
      {Icon === undefined ? null : (
        <Icon
          aria-hidden="true"
          className={cn(
            "shrink-0",
            tone === "warning" ? "text-warning" : "text-muted-foreground"
          )}
          size={14}
        />
      )}
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {detail}
      <span
        className={cn(
          "ml-auto min-w-0 truncate tabular-nums",
          tone === "warning" && "text-warning",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );

  if (hint === undefined) {
    return row;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={row} />
      {/* Left, because a rail sits at the right edge and a tooltip opening
          upward covers the rows a reader is comparing against. */}
      <TooltipContent className="max-w-56" side="left">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
