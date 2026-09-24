import { cn } from "@anpord/ui/lib/utils";
import { FRACTIONS } from "@/components/evals/waterfall-scale";

export function WaterfallGridlines() {
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
