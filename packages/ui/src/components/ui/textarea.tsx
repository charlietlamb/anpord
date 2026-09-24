import type * as React from "react";
import { FIELD_SURFACE } from "@anpord/ui/lib/field";
import { cn } from "@anpord/ui/lib/utils";

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        FIELD_SURFACE,
        "flex field-sizing-content min-h-16 w-full resize-none px-3 py-2 text-sm placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      data-slot="textarea"
      {...props}
    />
  );
}
