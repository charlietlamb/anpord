import type { EvalComparison } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { verdictMark } from "@/lib/evals/eval-status";

const MOVED = new Set(["improved", "regressed"]);

const signed = (delta: number) => `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`;

export function VerdictLine({
  comparison,
}: {
  readonly comparison: EvalComparison | null;
}) {
  if (comparison === null) {
    return (
      <p className="text-muted-foreground text-xs">
        First reading of this cell, so there is nothing to compare it with yet.
      </p>
    );
  }

  const mark = verdictMark(comparison.verdict);

  return (
    <RailFact
      hint={comparison.reason}
      Icon={mark.Icon}
      label="verdict"
      layout="stated"
      tone={mark.tone}
      value={
        MOVED.has(comparison.verdict)
          ? `${comparison.verdict} ${signed(comparison.delta)}`
          : comparison.verdict
      }
    />
  );
}
