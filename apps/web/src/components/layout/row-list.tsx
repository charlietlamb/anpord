import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import type { KeyboardEvent, ReactNode } from "react";

export function RowList({
  as = "div",
  children,
  className,
  label,
  onKeyDown,
  role,
}: {
  /* `ol` where the order carries meaning, as it does in a trajectory. */
  readonly as?: "div" | "ol";
  readonly children: ReactNode;
  readonly className?: string;
  readonly label?: string;
  readonly onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  readonly role?: "listbox";
}) {
  const Element = as;

  return (
    <Element
      aria-label={label}
      className={cn(BLEED_ROW, "flex flex-col", className)}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={role === undefined ? undefined : -1}
    >
      {children}
    </Element>
  );
}
