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
    <div
      className={cn("flex min-w-0 items-center justify-end gap-1.5", className)}
    >
      {children}
    </div>
  );
}
