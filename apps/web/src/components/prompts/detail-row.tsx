import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface DetailRowProps {
  readonly children: ReactNode;
  /** Stands in for the label, which is only needed by a screen reader once the
   * icon carries the meaning on screen. */
  readonly icon: Icon;
  readonly label: string;
}

/**
 * One property of the prompt. The icon names the field and the value follows
 * it, so the column reads down a single edge rather than splitting each row
 * between a label on the left and a value pushed to the right.
 */
export function DetailRow({
  children,
  icon: PropertyIcon,
  label,
}: DetailRowProps) {
  return (
    <div className="flex h-7 items-center gap-2 text-label">
      <PropertyIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span className="sr-only">{label}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  );
}
