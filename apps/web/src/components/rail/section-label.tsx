import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface SectionLabelProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Names a region without drawing one. The label sits on the page at reduced
 * contrast so the rows beneath it stay the loudest thing in the column, which
 * is what a titled bar with its own fill could never allow.
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
      <h2 className="truncate font-medium text-muted-foreground text-xs">
        {children}
      </h2>
      {action}
    </div>
  );
}
