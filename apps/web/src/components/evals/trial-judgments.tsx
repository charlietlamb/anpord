import type { EvalJudgment } from "@anpord/schema/domain/eval-judges";
import { RailSection } from "@anpord/ui/components/ui/rail-section";

export function TrialJudgments({
  judgments = [],
}: {
  readonly judgments?: readonly EvalJudgment[];
}) {
  if (judgments.length === 0) {
    return null;
  }
  return (
    <RailSection title="Judgments">
      <div className="flex flex-col gap-3 text-xs">
        {judgments.map((judgment) => (
          <div className="flex flex-col gap-1" key={judgment.name}>
            <span className="font-medium">
              {judgment.name}: {judgment.score ?? "unscored"}
            </span>
            <span className="text-muted-foreground">
              {judgment.model} · threshold {judgment.threshold}
            </span>
            <p>{judgment.error ?? judgment.reason}</p>
          </div>
        ))}
      </div>
    </RailSection>
  );
}
