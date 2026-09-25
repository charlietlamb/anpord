import { cn } from "@anpord/ui/lib/utils";
import { KIND_COLOURS, kindOf } from "@/lib/evals/journal-presentation";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";
import { BAR } from "@/lib/evals/waterfall-scale";

const MIN_BAR = 3;

const THINKING =
  "repeating-linear-gradient(135deg, var(--muted-foreground) 0 1px, transparent 1px 4px)";

const CENTRED = "absolute top-1/2 block -translate-y-1/2";

const DRIFTING =
  "[animation:thinking-drift_0.9s_linear_infinite] motion-reduce:animate-none";

/* A bar that has not finished says so by moving its own surface. Growing it
   against the clock would rescale every other bar on each frame, which reads
   as a stutter no transition can smooth. */
const WORKING = cn(
  "[background-size:8px_8px]",
  "[animation:thinking-drift_0.9s_linear_infinite] motion-reduce:animate-none"
);

const LIT = cn(
  "transition-[filter] duration-150 ease-out",
  "group-hover:brightness-110 group-focus-visible:brightness-110",
  "motion-reduce:transition-none"
);

export function Track({ row }: { readonly row: WaterfallRow }) {
  const background = KIND_COLOURS[kindOf(row)];

  return (
    <>
      {row.lead === null ? null : (
        <span
          className={cn(
            CENTRED,
            LIT,
            "h-2 rounded-sm opacity-40",
            row._tag === "bar" && row.running === true && DRIFTING
          )}
          style={{
            background: THINKING,
            left: `${row.lead.fromPercent}%`,
            width: `${row.lead.widthPercent}%`,
          }}
        />
      )}

      {row._tag === "bar" ? (
        <span
          className={cn(CENTRED, BAR, LIT, row.running === true && WORKING)}
          style={{
            background:
              row.running === true
                ? `repeating-linear-gradient(135deg, ${background} 0 4px, transparent 4px 8px), ${background}`
                : background,
            left: `${row.leftPercent}%`,
            minWidth: MIN_BAR,
            width: `${row.widthPercent}%`,
          }}
        />
      ) : (
        <span
          className={cn(CENTRED, LIT, "size-2.5 -translate-x-1/2 rounded-full")}
          style={{ background, left: `${row.leftPercent}%` }}
        />
      )}
    </>
  );
}
