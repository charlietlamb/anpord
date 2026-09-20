import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { ROW_SHAPE } from "@/components/layout/list-row";
import {
  type MetricShape,
  MetricSkeleton,
} from "@/components/layout/metric-skeleton";
import { RowList } from "@/components/layout/row-list";

/* Slot widths must track TrialRow's own metric columns. */
const METRICS: readonly MetricShape[] = [
  { slot: "w-20", value: "w-6" },
  { slot: "w-24", value: "w-6" },
  { slot: "w-16", value: "w-8" },
  { slot: "w-16", value: "w-8" },
  { slot: "w-20", value: "w-10" },
];

const ROWS = 6;

function TrialRowSkeleton() {
  return (
    <div className={cn(BLEED_ROW, "flex items-center")}>
      <div className={cn(ROW_SHAPE, "min-w-0 flex-1")}>
        <Skeleton className="size-6 rounded-md" />

        <span className="ml-auto flex shrink-0 items-center gap-4">
          {METRICS.map((shape, index) => (
            <MetricSkeleton
              key={`metric-${index satisfies number}`}
              shape={shape}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export function TrialListSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-2 font-medium text-label text-muted-foreground">
        Trials
      </span>
      <RowList label="Trials">
        {Array.from({ length: ROWS }, (_row, index) => (
          <TrialRowSkeleton key={`row-${index satisfies number}`} />
        ))}
      </RowList>
    </div>
  );
}
