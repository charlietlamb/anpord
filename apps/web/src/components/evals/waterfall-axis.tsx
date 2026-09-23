import { cn } from "@anpord/ui/lib/utils";
import { FRACTIONS, TICKS } from "@/components/evals/waterfall-scale";
import { seconds } from "@/lib/evals/duration";

const tickShift = (index: number) => {
  if (index === 0) {
    return;
  }

  return index === TICKS ? "translateX(-100%)" : "translateX(-50%)";
};

export function Axis({ spanMs }: { readonly spanMs: number }) {
  return (
    <span className="relative block h-4 w-full">
      {FRACTIONS.map((fraction, index) => (
        <span
          className="absolute top-0 tabular-nums"
          key={fraction}
          style={{ left: `${fraction * 100}%`, transform: tickShift(index) }}
        >
          {seconds(Math.round(spanMs * fraction))}
        </span>
      ))}
    </span>
  );
}

export function Gridlines() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {FRACTIONS.map((fraction) => (
        <span
          className={cn(
            "absolute inset-y-0 w-px",
            fraction === 0 ? "bg-border" : "bg-border/50"
          )}
          key={fraction}
          style={{ left: `${fraction * 100}%` }}
        />
      ))}
    </span>
  );
}
