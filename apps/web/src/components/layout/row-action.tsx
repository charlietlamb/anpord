import { cn } from "@anpord/ui/lib/utils";

/**
 * A control that appears on the row it acts on.
 *
 * Hidden until the pointer or the keyboard reaches its row, because a control
 * lit on every row competes with the rows themselves and there is only ever
 * one row being pointed at. Stays lit while its own menu is open, or it
 * vanishes underneath the menu it opened.
 *
 * Shared because four rows had each written this string and three of them had
 * drifted: two sizes, and one that forgot the open state and disappeared while
 * a reader was choosing from it.
 */
export const ROW_ACTION = cn(
  "size-6 shrink-0 rounded opacity-0",
  "focus-visible:opacity-100 group-hover/row:opacity-100",
  "data-[popup-open]:opacity-100"
);
