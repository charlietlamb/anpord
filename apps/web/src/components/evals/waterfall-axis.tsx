import { seconds } from "@/lib/evals/duration";

const TICKS = 4;

/* Without shifting the end tick, its label overflows the chart. */
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
