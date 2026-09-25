import { cn } from "@anpord/ui/lib/utils";
import { ticksFor } from "@/lib/evals/waterfall-scale";

export function WaterfallGridlines({ spanMs }: { readonly spanMs: number }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {ticksFor(spanMs).map((tick) => (
        <span
          className={cn(
            "absolute inset-y-0 w-px",
            tick.atMs === 0 ? "bg-border" : "bg-border/50"
          )}
          key={tick.atMs}
          style={{ left: `${tick.fraction * 100}%` }}
        />
      ))}
    </span>
  );
}
