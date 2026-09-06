import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

export interface MetricShape {
  readonly slot: string;
  readonly value: string;
}

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
