import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { ROW_SHAPE } from "@/components/layout/list-row";

/* Varied widths, because identical rows read as a loading bar rather than a list. */
const WIDTHS = ["w-24", "w-20", "w-28"] as const;

function ConnectionRowSkeleton({ name }: { readonly name: string }) {
  return (
    <div className={cn(BLEED_ROW, ROW_SHAPE)}>
      <Skeleton className="size-3.5 shrink-0 rounded-sm" />

      <span className="flex min-w-0 items-center gap-2">
        <Skeleton className={cn("h-3", name)} />
        <Skeleton className="h-3 w-28" />
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="size-4 shrink-0 rounded-sm" />
      </span>
    </div>
  );
}

export function ConnectionListSkeleton({
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
