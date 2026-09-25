import { seconds } from "@anpord/ui/lib/evals/duration";
import { cn } from "@anpord/ui/lib/utils";
import { ticksFor } from "@/lib/evals/waterfall-scale";

const tickShift = (fraction: number) => {
  if (fraction === 0) {
    return;
  }

  return fraction === 1 ? "-translate-x-full" : "-translate-x-1/2";
};

export function WaterfallAxis({ spanMs }: { readonly spanMs: number }) {
  return (
    <span className="relative block h-4 w-full">
      {ticksFor(spanMs).map((tick) => (
        <span
          className={cn(
            "absolute top-0 tabular-nums",
            tickShift(tick.fraction)
          )}
          key={tick.atMs}
          style={{ left: `${tick.fraction * 100}%` }}
        >
          {seconds(tick.atMs)}
        </span>
      ))}
    </span>
  );
}
