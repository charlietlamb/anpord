import { Skeleton } from "@anpord/ui/components/skeleton";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors a row's three lines, so the list does not resize as it loads. */
const ROWS = ["first", "second", "third", "fourth"];

export function PromptListSkeleton() {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent/50",
        ROW_DIVIDERS
      )}
    >
      {ROWS.map((row) => (
        <div className="flex flex-col gap-2 px-4 py-3.5" key={row}>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-5 w-24 rounded-md" />
          </div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-56" />
        </div>
      ))}
    </div>
  );
}
