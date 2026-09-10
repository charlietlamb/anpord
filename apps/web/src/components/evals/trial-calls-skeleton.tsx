import { Skeleton } from "@anpord/ui/components/skeleton";
import { PlugsConnectedIcon } from "@phosphor-icons/react";

/* One line, because the section it stands in for is closed until asked for.
   A skeleton of the open list would collapse the moment the answer arrived. */
export function TrialCallsSkeleton() {
  return (
    <div className="flex items-center gap-2 py-2">
      <PlugsConnectedIcon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <span className="text-muted-foreground text-xs">Calls</span>
      <Skeleton className="h-3.5 w-8" />
    </div>
  );
}
