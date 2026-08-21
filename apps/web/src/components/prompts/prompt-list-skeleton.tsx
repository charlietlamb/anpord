import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors PromptRow: a face, a name, its handle, then version and time. */
const ROWS = ["w-32", "w-40", "w-28", "w-36", "w-24"];

export function PromptListSkeleton() {
  return (
    <div className="-mx-2 flex flex-col">
      {ROWS.map((name) => (
        <div className="flex h-10 items-center gap-2.5 px-2" key={name}>
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <Skeleton className={cn("h-3", name)} />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ml-auto h-4 w-8 rounded-md" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
