import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors PromptRow: an identifier column, a name, then version, time, face. */
const ROWS = ["w-32", "w-40", "w-28", "w-36", "w-24"];

export function PromptListSkeleton() {
  return (
    <div className="-mx-2 flex flex-col">
      {ROWS.map((name) => (
        <div className="flex h-9 items-center gap-3 px-2" key={name}>
          <Skeleton className="h-3 w-44" />
          <Skeleton className={cn("h-3", name)} />
          <Skeleton className="ml-auto h-4 w-8 rounded-md" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="size-5 rounded-full" />
        </div>
      ))}
    </div>
  );
}
