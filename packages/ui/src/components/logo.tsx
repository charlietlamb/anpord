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
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <path
          d="M-9-44H9L19-34L9-28L13-23L8-18H-8L-13-23L-9-28L-19-34Z"
          key={angle}
          transform={`rotate(${angle})`}
        />
      ))}
    </svg>
  );
}
