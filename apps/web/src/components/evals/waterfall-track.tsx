import { cn } from "@anpord/ui/lib/utils";
import { KIND_COLOURS, kindOf } from "@/lib/evals/journal-presentation";
import { spanOfRow, type WaterfallRow } from "@/lib/evals/waterfall-layout";

/* Below 3px a real span is unhittable and reads as a zero-duration tick. */
const MIN_BAR = 3;

/* Square ends say where a step began and ended; a pill rounds that away. */
const BAR = "h-2.5 rounded-[2px]";

export function Track({ row }: { readonly row: WaterfallRow }) {
  const background = KIND_COLOURS[kindOf(row)];

  const { from, width } = spanOfRow(row);

  if (row._tag === "marker" && row.lead === null) {
    return (
      <span
        className={cn(
          "absolute top-1/2 block w-[3px] -translate-x-1/2 -translate-y-1/2 transition-[width] duration-150 ease-out group-hover:w-[5px] group-focus-visible:w-[5px] motion-reduce:transition-none",
          BAR
        )}
        style={{ background, left: `${row.leftPercent}%` }}
      />
    );
  }

  return (
    <span
      className={cn(
        "absolute top-1/2 block -translate-y-1/2 transition-[filter] duration-150 ease-out group-hover:brightness-125 group-focus-visible:brightness-125 motion-reduce:transition-none",
        BAR
      )}
      style={{
        background,
        left: `${from}%`,
        minWidth: MIN_BAR,
        width: `${width}%`,
      }}
    />
  );
}
