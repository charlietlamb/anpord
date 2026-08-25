import { EVAL_PAGE_SIZE } from "@anpord/schema/domain/evals";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { ROW_SHAPE } from "@/components/layout/list-row";

/* The names a list of runs actually holds, cycled to fill the page. Varying
   them is what makes the list read as content arriving rather than as a
   progress bar. */
const NAMES = ["w-36", "w-28", "w-40", "w-32", "w-24"];

/* Two marks rather than three: a run names a harness and a sandbox, and the
   third slot is only filled when a model carries its own. */
const MARKS = 2;

const rows = Array.from(
  { length: EVAL_PAGE_SIZE },
  (_row, index) => NAMES[index % NAMES.length] ?? "w-32"
);

/**
 * One run, before it is known.
 *
 * Built from the row's own parts rather than from bars standing in for them.
 * The variant column is two marks at `size-3.5` because that is what
 * `VariantMarks` draws there, so the icons land where the icons will be; a
 * single bar across the column had the right width and the wrong shape, and
 * the marks appeared out of nowhere when the data arrived.
 */
function EvalRowSkeleton({ name }: { readonly name: string }) {
  return (
    <div className={cn(BLEED_ROW, ROW_SHAPE)}>
      {/* RunStatusIcon: a `size-4` box holding a round glyph. */}
      <Skeleton className="size-4 shrink-0 rounded-full" />

      <Skeleton className={cn("h-3", name)} />

      <span className="ml-auto flex shrink-0 items-center gap-4">
        {/* VariantMarks: right-aligned marks, `gap-1.5`, in a `w-20` slot. */}
        <span className="flex w-20 items-center justify-end gap-1.5">
          {Array.from({ length: MARKS }, (_mark, index) => (
            <Skeleton
              className="size-3.5 shrink-0 rounded-sm"
              key={`mark-${index satisfies number}`}
            />
          ))}
        </span>

        {/* OutcomeSummary, CommandSpread, duration, then when it started. */}
        <span className="flex w-12 justify-end">
          <Skeleton className="h-3 w-8" />
        </span>
        <span className="flex w-20 justify-end">
          <Skeleton className="h-3 w-14" />
        </span>
        <span className="flex w-10 justify-end">
          <Skeleton className="h-3 w-8" />
        </span>
        <span className="flex w-20 justify-end">
          <Skeleton className="h-3 w-16" />
        </span>
      </span>
    </div>
  );
}

/** A page of runs waiting to load, as tall as the page that replaces it. */
export function EvalListSkeleton() {
  return (
    <div className="flex flex-col">
      {rows.map((name, index) => (
        <EvalRowSkeleton key={`row-${index satisfies number}`} name={name} />
      ))}
    </div>
  );
}
