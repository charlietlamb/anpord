import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";

/* The grid's own tracks, so the skeleton columns land on the real ones. */
const TRACKS =
  "grid grid-cols-[auto_minmax(0,1fr)_repeat(4,auto)_auto] gap-x-4 gap-y-0";

const LINE = "col-span-full grid grid-cols-subgrid items-center";

/* Pass, model, commands, tokens, at the widths their figures settle at. */
const METRICS = ["w-8", "w-8", "w-6", "w-10"];

/* One case with two variants under it: the shape a comparison run takes.
   Four lines reserved twice the height most runs fill, so the page shrank as
   the grid arrived -- the same settling as reserving too little, inverted. */
const VARIANTS = ["w-28", "w-36"];

function CellLineSkeleton({ name }: { readonly name: string }) {
  return (
    <div className={cn(LINE, BLEED_ROW, "h-10")}>
      {/* RunStatusIcon, the variant's name, its metrics, then the verdict
          slot the line keeps whether or not a comparison lands in it. */}
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

      <span className="flex min-w-5 justify-end" />
    </div>
  );
}

/** The comparison grid before its cells are known. */
export function RunGridSkeleton() {
  return (
    <div className={TRACKS}>
      {/* CaseHeading: an `h-9` divider carrying the case name and its tally. */}
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
