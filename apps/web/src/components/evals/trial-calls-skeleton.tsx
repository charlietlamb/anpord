import { Skeleton } from "@anpord/ui/components/skeleton";
import { PlugsConnectedIcon } from "@phosphor-icons/react";

/* One line, because the section it stands in for is closed until asked for.
   A skeleton of the open list would collapse the moment the answer arrived. */
export function TrialCallsSkeleton() {
  return (
    <div className="flex items-center gap-2 py-2 text-muted-foreground text-xs">
      <PlugsConnectedIcon aria-hidden="true" className="size-3.5 shrink-0" />
      <Skeleton className="h-3.5 w-4" />
      <span>Calls</span>
      <span aria-hidden="true">›</span>
    </div>
  );
}
