import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** Mirrors PromptRow: a dot, a name, an identifier, a time. */
const ROWS = [
  { id: "w-24", name: "w-32" },
  { id: "w-20", name: "w-40" },
  { id: "w-28", name: "w-28" },
  { id: "w-16", name: "w-36" },
];

export function PromptListSkeleton() {
  return (
    <div className="-mx-2 flex flex-col">
      {ROWS.map((row) => (
        <div className="flex h-7 items-center gap-2 px-2" key={row.name}>
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className={cn("h-3", row.name)} />
          <Skeleton className={cn("h-3", row.id)} />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
