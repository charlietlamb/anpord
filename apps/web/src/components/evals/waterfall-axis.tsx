import { seconds } from "@/lib/evals/duration";

const TICKS = 4;

/* First tick hugs the left edge, last hugs the right, the rest centre on their
   line. Without this the end label overflows the chart. */
const tickShift = (index: number) => {
  if (index === 0) {
    return;
  }

  return index === TICKS ? "translateX(-100%)" : "translateX(-50%)";
};

const fractions = Array.from(
  { length: TICKS + 1 },
  (_, index) => index / TICKS
);

/** The scale every bar below is read against, so a width means something. */
export function Axis({ spanMs }: { readonly spanMs: number }) {
  return (
    <div className="relative h-4">
      {fractions.map((fraction, index) => (
        <span
          className="absolute top-0 text-[11px] text-muted-foreground tabular-nums"
          key={fraction}
          style={{ left: `${fraction * 100}%`, transform: tickShift(index) }}
        >
          {seconds(Math.round(spanMs * fraction))}
        </span>
      ))}
    </div>
  );
}

/** Run the full height rather than stopping at the axis, so a bar is read
 * against the scale instead of against the row above it. */
export function Gridlines() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {fractions.map((fraction) => (
        <span
          className="absolute top-0 bottom-0 w-px bg-border/60"
          key={fraction}
          style={{ left: `${fraction * 100}%` }}
        />
      ))}
    </div>
  );
}
