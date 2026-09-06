import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { ROW_SHAPE } from "@/components/layout/list-row";

/* Shares ROW_SHAPE geometry so the list does not settle when real rows replace it. */
export function SkeletonRows({
  gutter,
  leading = "size-4 rounded-full",
  meta,
  ordinal,
  trailing,
  widths,
}: {
  /* Reserved, not drawn: a slot the row often leaves empty. */
  readonly gutter?: string;
  readonly leading?: string | null;
  readonly meta: readonly string[];
  readonly ordinal?: string;
  readonly trailing?: string;
  readonly widths: readonly string[];
}) {
  return (
    <div className="flex flex-col">
      {/* Keyed by position: two rows sharing a width class would collapse into one. */}
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

          {/* gap-4 matches what ListRow sets between meta values. */}
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
