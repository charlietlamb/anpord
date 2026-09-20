import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { LINE, TRACKS } from "@/components/evals/run-grid-columns";

/* Widths track RunGrid's own columns: the grid sizes to content, so a
   wider placeholder pushes every track after it. */
const METRICS = ["w-[34px]", "w-[34px]", "w-2", "w-[50px]"];

const VARIANTS = ["w-28", "w-36"];

function CellLineSkeleton({ name }: { readonly name: string }) {
  return (
    <div className={cn(LINE, BLEED_ROW, "h-10")}>
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <Skeleton className={cn("h-3", name)} />

      {METRICS.map((value, index) => (
        <span
          className="flex shrink-0 items-center justify-end gap-1.5"
          key={`metric-${index satisfies number}`}
        >
          <Skeleton className="size-3.5 shrink-0 rounded-sm" />
          <Skeleton className={cn("h-3", value)} />
        </span>
      ))}

      <span className="flex min-w-5 justify-end">
        <Skeleton className="h-3 w-[49px]" />
      </span>
    </div>
  );
}

export function RunGridSkeleton() {
  return (
    <div className={cn("grid", TRACKS)}>
      <div className="col-span-full flex h-9 items-center gap-2.5 pt-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-6" />
      </div>

      {VARIANTS.map((name, index) => (
        <CellLineSkeleton key={`line-${index satisfies number}`} name={name} />
      ))}
    </div>
  );
}
