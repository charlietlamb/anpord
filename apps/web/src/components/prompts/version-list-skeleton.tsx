import { Skeleton } from "@anpord/ui/components/skeleton";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors VersionRow: a version line above, message and time below. */
const ROWS = [
  { message: "w-32", time: "w-10" },
  { message: "w-24", time: "w-12" },
  { message: "w-28", time: "w-9" },
];

export function VersionListSkeleton() {
  return (
    <div className={cn("flex flex-col", ROW_DIVIDERS)}>
      {ROWS.map((row) => (
        <div className="flex flex-col gap-2 px-3.5 py-2.5" key={row.message}>
          <span className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-6" />
            <Skeleton className="ml-auto size-4 rounded-full" />
          </span>
          <span className="flex items-baseline gap-3">
            <Skeleton className={cn("h-3.5", row.message)} />
            <Skeleton className={cn("ml-auto h-3", row.time)} />
          </span>
        </div>
      ))}
    </div>
  );
}
