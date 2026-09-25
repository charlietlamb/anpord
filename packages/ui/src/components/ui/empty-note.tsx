import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

export function EmptyNote({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <p
      className={cn(
        "py-6 text-center text-muted-foreground text-xs",
        className
      )}
    >
      {children}
    </p>
  );
}
