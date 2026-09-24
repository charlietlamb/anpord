import { DropdownMenuItem } from "@anpord/ui/components/dropdown-menu";
import { cn } from "@anpord/ui/lib/utils";
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
