import { EVAL_PAGE_SIZE } from "@anpord/schema/domain/evals";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { ROW_SHAPE } from "@/components/layout/list-row";

const NAMES = ["w-36", "w-28", "w-40", "w-32", "w-24"];

const MARKS = 2;

const rows = Array.from(
  { length: EVAL_PAGE_SIZE },
  (_row, index) => NAMES[index % NAMES.length] ?? "w-32"
);

/* Shapes must mirror EvalRow's real parts, or marks appear from nowhere when data lands. */
function EvalRowSkeleton({ name }: { readonly name: string }) {
  return (
    <div className={cn(BLEED_ROW, ROW_SHAPE)}>
      <Skeleton className="size-4 shrink-0 rounded-full" />

      <Skeleton className={cn("h-3", name)} />

      <span className="ml-auto flex shrink-0 items-center gap-4">
        <span className="flex w-20 items-center justify-end gap-1.5">
          {Array.from({ length: MARKS }, (_mark, index) => (
            <Skeleton
              className="size-3.5 shrink-0 rounded-sm"
              key={`mark-${index satisfies number}`}
            />
          ))}
        </span>

        <span className="flex w-16 items-center justify-end">
          <Skeleton className="size-3.5 shrink-0 rounded-full" />
        </span>
        <span className="flex w-12 justify-end">
          <Skeleton className="h-3 w-7" />
        </span>
        <span className="flex w-16 justify-end">
          <Skeleton className="h-3 w-12" />
        </span>
      </span>
    </div>
  );
}

export function EvalListSkeleton() {
  return (
    <div className="flex flex-col">
      {rows.map((name, index) => (
        <EvalRowSkeleton key={`row-${index satisfies number}`} name={name} />
      ))}
    </div>
  );
}
