import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors ApiKeyRow: a name, a prefix, a created time. */
const ROWS = ["w-28", "w-20", "w-32"];

export function ApiKeyListSkeleton() {
  return (
    <div className="-mx-2 flex flex-col">
      {ROWS.map((width) => (
        <div className="flex h-9 items-center gap-2.5 px-2" key={width}>
          <Skeleton className={cn("h-3", width)} />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
