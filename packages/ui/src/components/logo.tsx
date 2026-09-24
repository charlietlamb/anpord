import { LogoPetals } from "@anpord/ui/components/logo-petals";
import type * as React from "react";
import { cn } from "../lib/utils";

export function Logo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("size-6", className)}
      fill="currentColor"
      role="img"
      viewBox="-48 -48 96 96"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Anpord</title>
      <LogoPetals />
    </svg>
  );
}
