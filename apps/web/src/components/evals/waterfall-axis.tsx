import { FRACTIONS, TICKS } from "@/components/evals/waterfall-scale";
import { seconds } from "@/lib/evals/duration";

const tickShift = (index: number) => {
  if (index === 0) {
    return;
  }

  return index === TICKS ? "translateX(-100%)" : "translateX(-50%)";
};

export function WaterfallAxis({ spanMs }: { readonly spanMs: number }) {
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
