import { cn } from "@anpord/ui/lib/utils";
import {
  FRACTIONS,
  LABEL_WIDTH,
  TICKS,
} from "@/components/evals/waterfall-scale";
import { seconds } from "@/lib/evals/duration";

/* Without shifting the end tick, its label overflows the chart. */
const tickShift = (index: number) => {
  if (index === 0) {
    return;
  }

  return index === TICKS ? "translateX(-100%)" : "translateX(-50%)";
};

export function Axis({ spanMs }: { readonly spanMs: number }) {
  return (
    <div className="flex items-end">
      <span className="shrink-0" style={{ width: LABEL_WIDTH }} />

      <div className="relative h-4 min-w-0 flex-1">
        {FRACTIONS.map((fraction, index) => (
          <span
            className="absolute top-0 font-medium text-[11px] text-muted-foreground tabular-nums"
            key={fraction}
            style={{
              left: `${fraction * 100}%`,
              transform: tickShift(index),
            }}
          >
            {seconds(Math.round(spanMs * fraction))}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Gridlines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex"
    >
      <span className="shrink-0" style={{ width: LABEL_WIDTH }} />

      <div className="relative min-w-0 flex-1">
        {FRACTIONS.map((fraction) => (
          <span
            className={cn(
              "absolute top-0 bottom-0 w-px",
              fraction === 0 ? "bg-border" : "bg-border/50"
            )}
            key={fraction}
            style={{ left: `${fraction * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
