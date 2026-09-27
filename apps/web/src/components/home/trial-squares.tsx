import type { TrialOutcome } from "@/lib/evals/home-view";

const FILL: Record<TrialOutcome, string> = {
  failed: "bg-destructive",
  passed: "bg-success/80",
  void: "bg-muted-foreground/40",
};

export function TrialSquares({
  trials,
}: {
  readonly trials: readonly TrialOutcome[];
}) {
  return (
    <span
      aria-hidden="true"
      className="flex w-[152px] shrink-0 flex-wrap justify-end gap-[3px]"
    >
      {trials.map((outcome, index) => (
        <span
          className={`skeleton:skeleton-paint size-2 rounded-[2px] ${FILL[outcome]}`}
          key={`${outcome}-${index.toString()}`}
        />
      ))}
    </span>
  );
}
