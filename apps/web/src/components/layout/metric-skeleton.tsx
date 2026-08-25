import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** A metric's slot width and the width of the figure inside it. */
export interface MetricShape {
  readonly slot: string;
  readonly value: string;
}

/**
 * One figure in a row's meta, before it is known.
 *
 * A `Metric` is a `size-3.5` glyph and a value, `gap-1.5`, right aligned in a
 * fixed slot. Drawn as one bar across the slot the glyph had nowhere to land
 * and appeared from nothing when the row arrived; drawn as both parts it lands
 * where it will settle.
 */
export function MetricSkeleton({ shape }: { readonly shape: MetricShape }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-end gap-1.5",
        shape.slot
      )}
    >
      <Skeleton className="size-3.5 shrink-0 rounded-sm" />
      <Skeleton className={cn("h-3", shape.value)} />
    </span>
  );
}
