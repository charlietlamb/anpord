import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { ROW_SHAPE } from "@/components/layout/list-row";

/**
 * A list before it has loaded.
 *
 * Shares its geometry with the row it stands in for, so the list does not
 * settle when the real rows replace it. Five skeletons had each grown their
 * own height and gap, and a list that shifts as it loads reads as a page that
 * loaded wrong.
 *
 * Widths vary down the list because names do: a column of identical bars reads
 * as a progress indicator rather than as content arriving.
 */
export function SkeletonRows({
  leading = "size-4 rounded-full",
  meta,
  widths,
}: {
  /** The marker column, or null for a list that has none. Held to the same
   * width either way, so rows line up whether or not they are filled. */
  readonly leading?: string | null;
  /** Widths of the right-hand facts, which every list has and no two share. */
  readonly meta: readonly string[];
  readonly widths: readonly string[];
}) {
  return (
    <div className="flex flex-col">
      {widths.map((width) => (
        <div className={cn(BLEED_ROW, ROW_SHAPE)} key={width}>
          {leading === null ? null : (
            <Skeleton className={cn("shrink-0", leading)} />
          )}
          <Skeleton className={cn("h-3", width)} />

          <span className="ml-auto flex items-center gap-2.5">
            {meta.map((each) => (
              <Skeleton className={cn("h-3", each)} key={each} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
