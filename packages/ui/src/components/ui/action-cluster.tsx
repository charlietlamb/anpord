import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface ActionClusterProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * The actions that act on a page, floated above it rather than seated in a bar
 * of their own. Nothing is drawn until a control is pointed at, so a reader
 * sees the content and someone reaching for a control still finds one.
 */
export function ActionCluster({ children, className }: ActionClusterProps) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      {children}
    </div>
  );
}

interface ActionGroupProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Actions that belong together, joined into one pill so the group reads as a
 * single control with parts rather than as neighbours that happen to touch.
 */
export function ActionGroup({ children, className }: ActionGroupProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border-faint",
        "[&>*]:rounded-none [&>*]:border-0",
        "[&>*:first-child]:rounded-l-full [&>*:last-child]:rounded-r-full",
        "[&>*:not(:first-child)]:border-border-faint [&>*:not(:first-child)]:border-l",
        className
      )}
    >
      {children}
    </div>
  );
}
