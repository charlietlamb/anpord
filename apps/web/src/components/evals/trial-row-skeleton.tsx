import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { ROW_SHAPE } from "@/components/layout/list-row";
import {
  type MetricShape,
  MetricSkeleton,
} from "@/components/layout/metric-skeleton";

/* Exit, commands, model, sandbox, tokens, at the slots TrialRow gives them. */
const METRICS: readonly MetricShape[] = [
  { slot: "w-20", value: "w-6" },
  { slot: "w-24", value: "w-6" },
  { slot: "w-16", value: "w-8" },
  { slot: "w-16", value: "w-8" },
  { slot: "w-20", value: "w-10" },
];

/* An ordinal is one or two characters, so the bars alternate between the two
   widths the column actually holds. */
const ORDINALS = ["w-2", "w-3"];

/* Six rows: a cell is usually run ten times, and three left the page a third
   of its final height so it grew as the trials arrived. Six is the most a
   reader sees before scrolling, which is the part that has to hold still. */
const ROWS = 6;

function TrialRowSkeleton({ ordinal }: { readonly ordinal: string }) {
  return (
    <div className={cn(BLEED_ROW, ROW_SHAPE)}>
      {/* TrialStatusMark, then the run column the row reserves and usually
          leaves empty, then the ordinal. */}
      <Skeleton className="size-4 shrink-0 rounded-full" />

      <span className="flex min-w-0 items-center gap-2.5">
        <span className="w-14 shrink-0" />
        <Skeleton className={cn("h-3", ordinal)} />
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-4">
        {METRICS.map((shape, index) => (
          <MetricSkeleton
            key={`metric-${index satisfies number}`}
            shape={shape}
          />
        ))}
      </span>
    </div>
  );
}

/** A reading's trials, waiting to load. */
export function TrialListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: ROWS }, (_row, index) => (
        <TrialRowSkeleton
          key={`row-${index satisfies number}`}
          ordinal={ORDINALS[index % ORDINALS.length] ?? "w-2"}
        />
      ))}
    </div>
  );
}
