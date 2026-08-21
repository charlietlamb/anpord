import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors PromptRow: a dot, an identifier column, a name, then meta. */
const ROWS = ["w-32", "w-40", "w-28", "w-36", "w-24"];

export function PromptListSkeleton() {
  return (
    <div className="-mx-2 flex flex-col">
      {ROWS.map((name) => (
        <div className="flex h-9 items-center gap-2.5 px-2" key={name}>
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className={cn("h-3", name)} />
          <Skeleton className="ml-auto h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
