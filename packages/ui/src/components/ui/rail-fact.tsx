import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import type { ComponentType, ReactNode } from "react";

/** Anything that draws itself from a class: a Phosphor glyph, a vendor mark,
 * an inline SVG of your own. */
export type RailIcon = ComponentType<{ readonly className?: string }>;

interface RailFactProps {
  /** Drawn between the label and the value, for a share bar or a badge. */
  readonly detail?: ReactNode;
  /** What the number means, for a label too short to say it. Takes a node so
   * a hint can hold a command in a code block rather than as a sentence. */
  readonly hint?: ReactNode;
  readonly Icon?: RailIcon;
  readonly label: string;
  /**
   * `spread` writes the label and pushes the value to the right edge, for a
   * column of numbers that only their labels tell apart.
   *
   * `stated` drops the written label and sets the value beside its icon, for a
   * value that already says what it is. `Daytona` needs no word `sandbox` in
   * front of it, and the pair of them across a gap makes an eye travel for a
   * fact it already had. The label still reaches a screen reader.
   */
  readonly layout?: "spread" | "stated";
  readonly tone?: "muted" | "warning";
  readonly value: ReactNode;
}

/**
 * One fact in a rail.
 *
 * Shared because three rails had each grown their own, and a run that lists
 * its provider as a row while a cell lists the same provider as a badge reads
 * as two different screens.
 *
 * An indented row (no icon) is part of the row above it, which is how the time
 * breakdown says that thinking sits inside the agent phase rather than beside
 * it.
 *
 * A hint opens to the left: a rail sits at the right edge of the screen, and a
 * tooltip opening upward covers the rows a reader is comparing against. A
 * hinted row is focusable, because an explanation only a pointer can reach is
 * one a keyboard never gets.
 */
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
          "cursor-help focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      )}
      role={hint === undefined ? undefined : "note"}
      tabIndex={hint === undefined ? undefined : 0}
    >
      {Icon === undefined ? null : (
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "warning" ? "text-warning" : "text-muted-foreground/80"
          )}
        />
      )}

      {stated ? null : (
        <span className="shrink-0 text-muted-foreground/80">{label}</span>
      )}

      {stated ? null : detail}

      <span
        className={cn(
          "min-w-0 truncate tabular-nums",
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
