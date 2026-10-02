import { LogoMark } from "@sphynx/ui/components/logo-mark";
import { MARK_VIEWBOX } from "@sphynx/ui/lib/brand";
import type * as React from "react";
import { cn } from "../lib/utils";

export function Logo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("size-6", className)}
      fill="currentColor"
      role="img"
      viewBox={MARK_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Sphynx</title>
      <LogoMark />
    </svg>
  );
}
