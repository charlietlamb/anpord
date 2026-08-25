import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

/** A fact's parts: the width of its value, and whether it carries a share bar. */
export interface RailFactShape {
  readonly share?: boolean;
  readonly width: string;
}

/**
 * The facts in a rail, before they are known.
 *
 * Every rail fact here is `layout="stated"`: a `size-3.5` icon and a value on a
 * `h-6` row, left aligned. The skeleton is those same parts at those same
 * sizes, so the section keeps its final height and nothing slides when the
 * numbers arrive.
 *
 * Widths vary because the values do. A column of equal bars reads as a
 * progress indicator rather than as facts about to appear.
 */
export function RailFactSkeleton({
  className,
  facts,
}: {
  readonly className?: string;
  readonly facts: readonly RailFactShape[];
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Keyed by position: two facts of the same width are still two facts,
          and keying by the class silently drops the second. */}
      {facts.map((fact, index) => (
        <div
          className="flex h-6 items-center gap-2"
          key={`fact-${index satisfies number}`}
        >
          <Skeleton className="size-3.5 shrink-0 rounded-sm" />
          <Skeleton className={cn("h-3", fact.width)} />

          {/* ShareBar: an `h-0.5 w-6` track the fact draws after its value. */}
          {fact.share === true ? (
            <Skeleton className="h-0.5 w-6 shrink-0 rounded-full" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
