import { KIND_COLOURS, kindOf } from "@/lib/evals/journal-presentation";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

/* Below 3px a real span is unhittable and reads as a zero-duration tick. */
const MIN_BAR = 3;

/* The wait before a step is the same colour held back, so the eye reads one
   run of time rather than two unrelated marks. */
const LEAD_TINT = 22;

export function Track({ row }: { readonly row: WaterfallRow }) {
  const background = KIND_COLOURS[kindOf(row)];

  return (
    <>
      {row.lead === null ? null : (
        <span
          className="absolute top-1/2 block h-1.5 -translate-y-1/2 rounded-full transition-opacity duration-150 ease-out group-hover:opacity-100 motion-reduce:transition-none"
          style={{
            backgroundColor: `color-mix(in oklch, ${background} ${LEAD_TINT}%, transparent)`,
            left: `${row.lead.fromPercent}%`,
            width: `${row.lead.widthPercent}%`,
          }}
        />
      )}

      {row._tag === "marker" ? (
        <span
          className="absolute top-1/2 block size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background transition-transform duration-150 ease-out group-hover:scale-150 group-focus-visible:scale-150 motion-reduce:transition-none"
          style={{ background, left: `${row.leftPercent}%` }}
        />
      ) : (
        <span
          className="absolute top-1/2 block h-1.5 -translate-y-1/2 rounded-full transition-[filter] duration-150 ease-out group-hover:brightness-125 group-focus-visible:brightness-125 motion-reduce:transition-none"
          style={{
            background,
            left: `${row.leftPercent}%`,
            minWidth: MIN_BAR,
            width: `${row.widthPercent}%`,
          }}
        />
      )}
    </>
  );
}
