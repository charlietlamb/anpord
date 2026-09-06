import { cn } from "@anpord/ui/lib/utils";

/* Stays lit while its own menu is open, or it vanishes underneath that menu. */
export const ROW_ACTION = cn(
  "size-6 shrink-0 rounded opacity-0",
  "focus-visible:opacity-100 group-hover/row:opacity-100",
  "data-[popup-open]:opacity-100"
);
