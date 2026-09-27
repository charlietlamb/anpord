import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { MarkdownProse } from "@/components/evals/markdown-prose";

const scoreLine = (judgment: NonNullable<EvalValidation["judgment"]>) => {
  const score =
    judgment.score === null ? "Unscored" : `Score ${judgment.score}`;
  const choice = judgment.choice === null ? "" : ` · ${judgment.choice}`;

  return `${score} · required ≥ ${judgment.threshold} · ${judgment.model}${choice}`;
};

export function ValidationJudgment({
  judgment,
}: {
  readonly judgment: NonNullable<EvalValidation["judgment"]>;
}) {
  return (
    <div className="space-y-3 text-sm leading-relaxed [overflow-wrap:anywhere]">
      <p className="text-muted-foreground text-xs">{scoreLine(judgment)}</p>
      <MarkdownProse
        className={
          judgment.error === null ? "text-foreground/90" : "text-destructive"
        }
        text={judgment.error ?? judgment.reason}
      />
    </div>
  );
}
