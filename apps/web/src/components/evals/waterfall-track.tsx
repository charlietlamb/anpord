import { KIND_COLOURS, kindOf } from "@/lib/evals/journal-presentation";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

/* Below 6px a real span is unhittable and reads as a zero-duration tick. */
const MIN_BAR = 6;

const hatched = (colour: string) =>
  `repeating-linear-gradient(45deg, ${colour} 0 3px, transparent 3px 6px)`;

export function Track({ row }: { readonly row: WaterfallRow }) {
  const background = KIND_COLOURS[kindOf(row)];

  if (row.lead !== null) {
    return (
      <span
        className="absolute top-1/2 block h-3 -translate-y-1/2 rounded-[3px] opacity-70 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        style={{
          backgroundColor: `color-mix(in oklch, ${background} 18%, transparent)`,
          backgroundImage: hatched(background),
          left: `${row.lead.fromPercent}%`,
          width: `${row.lead.widthPercent + (row._tag === "bar" ? row.widthPercent : 0)}%`,
        }}
      />
    );
  }

  return row._tag === "marker" ? (
    <span
      className="absolute top-1/2 block h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-[2px] transition-[filter,width] duration-150 ease-out group-hover:w-[5px] group-hover:brightness-125 group-focus-visible:w-[5px] group-focus-visible:brightness-125 motion-reduce:transition-none"
      style={{ background, left: `${row.leftPercent}%` }}
    />
  ) : (
    <span
      className="absolute top-1/2 block h-3 -translate-y-1/2 rounded-[3px] transition-[filter,transform] duration-150 ease-out group-hover:brightness-125 group-focus-visible:brightness-125 motion-reduce:transition-none"
      style={{
        background,
        left: `${row.leftPercent}%`,
        minWidth: MIN_BAR,
        width: `${row.widthPercent}%`,
      }}
    />
  );
}
