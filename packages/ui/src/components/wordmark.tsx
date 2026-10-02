import { LogoMark } from "@sphynx/ui/components/logo-mark";
import {
  NAME_PATH,
  WORDMARK_MARK_TRANSFORM,
  WORDMARK_VIEWBOX,
} from "@sphynx/ui/lib/brand";
import type * as React from "react";
import { cn } from "../lib/utils";

export function Wordmark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("h-5 w-auto", className)}
      fill="currentColor"
      role="img"
      viewBox={WORDMARK_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Sphynx</title>
      <g transform={WORDMARK_MARK_TRANSFORM}>
        <LogoMark />
      </g>
      <path d={NAME_PATH} />
    </svg>
  );
}
