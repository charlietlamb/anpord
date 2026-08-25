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
  gutter,
  leading = "size-4 rounded-full",
  meta,
  ordinal,
  trailing,
  widths,
}: {
  /** A fixed column the row holds before its name, for a list that leads with
   * one. Reserved rather than drawn: the trial table keeps a `w-14` slot for a
   * run id it usually leaves empty, and a bar there would place the name where
   * the row will not put it. */
  readonly gutter?: string;
  /** The marker column, or null for a list that has none. Held to the same
   * width either way, so rows line up whether or not they are filled. */
  readonly leading?: string | null;
  /** Widths of the right-hand facts, which every list has and no two share. */
  readonly meta: readonly string[];
  /** A short value the row sets before its name, for a list that numbers what
   * it holds: the version list leads each row with `v3`. */
  readonly ordinal?: string;
  /** A second value the row sets beside its name, for a list that names a
   * thing and then says how to address it: the prompt list trails its name
   * with a handle, and a lone bar there had the name sitting on its own. */
  readonly trailing?: string;
  readonly widths: readonly string[];
}) {
  return (
    <div className="flex flex-col">
      {/* Keyed by position, not by width. A width is a style, and two rows
          that happen to be the same length are still two rows: keyed by the
          class, `["w-4", "w-5", "w-4"]` rendered two rows instead of three. */}
      {widths.map((width, row) => (
        <div
          className={cn(BLEED_ROW, ROW_SHAPE)}
          key={`row-${row satisfies number}`}
        >
          {leading === null ? null : (
            <Skeleton className={cn("shrink-0", leading)} />
          )}
          {gutter === undefined ? null : (
            <span className={cn("shrink-0", gutter)} />
          )}
          {ordinal === undefined ? null : (
            <Skeleton className={cn("h-3 shrink-0", ordinal)} />
          )}
          <Skeleton className={cn("h-3", width)} />
          {trailing === undefined ? null : (
            <Skeleton className={cn("h-3 shrink-0", trailing)} />
          )}

          {/* gap-4 because that is what the row sets between its meta values.
              At gap-2.5 five columns landed 24px left of where they would
              settle, so the whole block slid right as the data arrived. */}
          <span className="ml-auto flex items-center gap-4">
            {meta.map((each, column) => (
              <Skeleton
                className={cn("h-3", each)}
                key={`meta-${column satisfies number}`}
              />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
