import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors VersionRow: one line, number then message then time. */
const ROWS = [
  { message: "w-28", time: "w-10" },
  { message: "w-20", time: "w-12" },
  { message: "w-24", time: "w-9" },
];

export function VersionListSkeleton() {
  return (
    <div className="-mx-2 flex flex-col">
      {ROWS.map((row) => (
        <div className="flex h-7 items-center gap-2 px-2" key={row.message}>
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className="h-3 w-5" />
          <Skeleton className={cn("h-3", row.message)} />
          <Skeleton className={cn("ml-auto h-3", row.time)} />
        </div>
      ))}
    </div>
  );
}
