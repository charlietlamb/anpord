import type * as React from "react";
import { cn } from "../lib/utils";

export function Logo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("size-6", className)}
      fill="currentColor"
      role="img"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Anpord</title>
      <path
        clipRule="evenodd"
        d="M9 2H23A7 7 0 0 1 30 9V23A7 7 0 0 1 23 30H9A7 7 0 0 1 2 23V9A7 7 0 0 1 9 2ZM8 8H24V16L16 24H8Z"
        fillRule="evenodd"
      />
    </svg>
  );
}
