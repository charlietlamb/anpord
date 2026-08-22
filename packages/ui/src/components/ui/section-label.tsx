import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface SectionLabelProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Names a region of the rail without drawing one. The label sits a step below
 * the rows it heads, which is what a titled bar with its own fill could never
 * allow: a heading is read once and the rows under it are read every time, so
 * the two cannot carry the same weight.
 *
 * A heading over the main column is a `PageHeading` instead: it names the
 * region the way the page title names the page, and two components saying the
 * same thing at different sizes is how a screen stops looking like one screen.
 */
export function SectionLabel({
  action,
  children,
  className,
}: SectionLabelProps) {
  return (
    <div
      className={cn("flex h-6 items-center justify-between gap-2", className)}
    >
      <h2 className="shrink-0 truncate font-medium text-[11px] text-muted-foreground/70">
        {children}
      </h2>
      {action}
    </div>
  );
}
