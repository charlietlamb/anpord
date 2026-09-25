import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { MarkdownProse } from "@/components/evals/markdown-prose";
import { ValidationValue } from "@/components/evals/validation-value";

const scoreLine = (judgment: NonNullable<EvalValidation["judgment"]>) => {
  const score =
    judgment.score === null ? "Unscored" : `Score ${judgment.score}`;
  const choice = judgment.choice === null ? "" : ` · ${judgment.choice}`;

  return `${score} · required ≥ ${judgment.threshold} · ${judgment.model}${choice}`;
};

function Judged({
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

export function ValidationResult({
  validation,
}: {
  readonly validation: EvalValidation;
}) {
  return (
    <div className="min-w-0">
      {validation.judgment ? (
        <Judged judgment={validation.judgment} />
      ) : (
        <dl>
          <ValidationValue label="Return value" value={validation.output} />
        </dl>
      )}

      {validation.error ? (
        <dl>
          <ValidationValue label="Error" value={validation.error} />
        </dl>
      ) : null}
    </div>
  );
}
