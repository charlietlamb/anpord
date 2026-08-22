import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors EvalRow: a status dot, a name, its grid, then the outcome. */
const ROWS = ["w-36", "w-28", "w-40", "w-32", "w-24"];

export function EvalListSkeleton() {
  return (
    <div className="-mx-2 flex flex-col">
      {ROWS.map((name) => (
        <div className="flex h-10 items-center gap-2.5 px-2" key={name}>
          <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
          <Skeleton className={cn("h-3", name)} />
          <Skeleton className="ml-auto h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
