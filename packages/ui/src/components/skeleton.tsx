import type * as React from "react";
import { cn } from "../lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md bg-muted/70", className)}
      {...props}
    />
  );
}
