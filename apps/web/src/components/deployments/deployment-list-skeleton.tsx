import { Skeleton } from "@anpord/ui/components/skeleton";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors a row's two lines, so the list does not resize as it loads. */
const ROWS = ["first", "second", "third", "fourth", "fifth"];

export function DeploymentListSkeleton() {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent",
        ROW_DIVIDERS
      )}
    >
      {ROWS.map((row) => (
        <div className="flex items-center gap-3 px-4 py-3" key={row}>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}
