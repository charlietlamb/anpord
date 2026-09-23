import type { ReactNode } from "react";
import { SURFACE_BODY, SURFACE_FRAME } from "@anpord/ui/lib/surface";
import { cn } from "@anpord/ui/lib/utils";

export function Surface({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={SURFACE_FRAME}>
      <div className={cn(SURFACE_BODY, className)}>{children}</div>
    </div>
  );
}
