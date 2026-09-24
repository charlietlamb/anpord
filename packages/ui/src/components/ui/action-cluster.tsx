import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface ActionClusterProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function ActionCluster({ children, className }: ActionClusterProps) {
  return (
    <div
      className={cn("flex min-w-0 items-center justify-end gap-1.5", className)}
    >
      {children}
    </div>
  );
}
