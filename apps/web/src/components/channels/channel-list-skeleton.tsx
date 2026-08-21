import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors ChannelListRow: a dot, a name, a count. */
const ROWS = ["w-24", "w-20", "w-28"];

export function ChannelListSkeleton() {
  return (
    <div className="-mx-2 flex flex-col">
      {ROWS.map((width) => (
        <div className="flex h-9 items-center gap-2.5 px-2" key={width}>
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className={cn("h-3", width)} />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
