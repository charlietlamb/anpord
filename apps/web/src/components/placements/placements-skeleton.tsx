import { Skeleton } from "@anpord/ui/components/skeleton";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors a row's two lines and its cells, so the grid does not resize as it
 * loads. */
const ROWS = ["first", "second", "third", "fourth", "fifth"];
const CELLS = ["one", "two", "three"];

export function PlacementsSkeleton() {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent",
        ROW_DIVIDERS
      )}
    >
      {ROWS.map((row) => (
        <div className="flex items-center gap-6 px-4 py-3" key={row}>
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-8" />
          {CELLS.map((cell) => (
            <Skeleton className="h-4 w-16" key={cell} />
          ))}
        </div>
      ))}
    </div>
  );
}
