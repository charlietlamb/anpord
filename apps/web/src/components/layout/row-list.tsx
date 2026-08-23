import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import type { KeyboardEvent, ReactNode } from "react";

/**
 * A column of rows.
 *
 * Bleeds by the row's own padding so a highlighted row reaches past the text
 * it aligns with, rather than stopping short of it. Every list that wrote this
 * container by hand omitted the bleed, so their rows highlighted past a
 * container that did not move with them.
 *
 * Takes the listbox props rather than leaving each list to remember them: a
 * list a keyboard can walk needs a role, a label and a handler, and four
 * screens had each supplied a different two of the three.
 */
export function RowList({
  as = "div",
  children,
  className,
  label,
  onKeyDown,
  role,
}: {
  /** `ol` where the order carries meaning, as it does in a trajectory. */
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
