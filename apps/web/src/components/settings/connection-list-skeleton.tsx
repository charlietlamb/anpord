import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { ROW_SHAPE } from "@/components/layout/list-row";

/* Widths, not counts: a name and the muted line beside it vary in length, and
   identical rows read as a loading bar rather than a list. */
const WIDTHS = ["w-24", "w-20", "w-28"] as const;

function ConnectionRowSkeleton({ name }: { readonly name: string }) {
  return (
    <div className={cn(BLEED_ROW, ROW_SHAPE)}>
      {/* The integration's own glyph, its name, then the method and scope the
          row sets muted beside it. */}
      <Skeleton className="size-3.5 shrink-0 rounded-sm" />

      <span className="flex min-w-0 items-center gap-2">
        <Skeleton className={cn("h-3", name)} />
        <Skeleton className="h-3 w-28" />
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-4">
        <Skeleton className="h-3 w-20" />
        {/* The row's menu trigger, which is a control and not a value. */}
        <Skeleton className="size-4 shrink-0 rounded-sm" />
      </span>
    </div>
  );
}

/**
 * One credential page before its rows are known.
 *
 * A flat run of rows, because each page is now one category: the version
 * before this laid out two titled sections and set their headings for real,
 * which was right when both lists lived on one page and became a page
 * claiming two sections that never arrived.
 */
export function ConnectionListSkeleton({
  /** Codebase holds one account; a credential list usually holds a couple. */
  rows = 2,
}: {
  readonly rows?: number;
}) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }, (_, index) => (
        <ConnectionRowSkeleton
          key={`row-${index satisfies number}`}
          name={WIDTHS[index % WIDTHS.length] ?? "w-24"}
        />
      ))}
    </div>
  );
}
