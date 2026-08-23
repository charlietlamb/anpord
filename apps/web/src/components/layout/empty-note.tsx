import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * A section with nothing in it, said in a line.
 *
 * Smaller than `ListState`, which owns a whole screen and offers an action.
 * This is the sentence a section prints in place of its content: a trial that
 * recorded no journal, a run whose grid has not registered yet. There is
 * nothing for a reader to do about any of them, so there is no button.
 */
export function EmptyNote({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <p
      className={cn(
        "py-6 text-center text-muted-foreground text-xs",
        className
      )}
    >
      {children}
    </p>
  );
}
