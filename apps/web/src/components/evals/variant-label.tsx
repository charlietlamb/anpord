import type { RailIcon } from "@anpord/ui/components/ui/rail-fact";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

export function VariantLabel({
  children,
  className,
  Icon,
  size = "default",
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly Icon: RailIcon;
  readonly size?: "compact" | "default";
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Icon
        className={cn(
          "shrink-0 opacity-70",
          size === "compact" ? "size-3" : "size-3.5"
        )}
      />
      <span className="truncate">{children}</span>
    </span>
  );
}
