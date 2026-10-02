import { DropdownMenuItem } from "@sphynx/ui/components/dropdown-menu";
import { cn } from "@sphynx/ui/lib/utils";
import type { ComponentProps } from "react";

export function DestructiveMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      className={cn("text-destructive focus:text-destructive", className)}
      {...props}
    />
  );
}
