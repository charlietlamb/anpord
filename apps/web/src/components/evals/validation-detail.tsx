import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { PageTabs } from "@anpord/ui/components/ui/page-tabs";
import {
  BracketsCurlyIcon,
  ListMagnifyingGlassIcon,
  SignInIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { MarkdownProse } from "@/components/evals/markdown-prose";
import { ReadEvidence, Value } from "@/components/evals/validation-evidence";

type Pane = "result" | "evidence" | "execution";

const executionRows = (validation: EvalValidation) => [
  { label: "Invocation input", value: validation.input },
  ...(validation.judgment
    ? [{ label: "Raw response", value: validation.output }]
    : []),
  ...(validation.metadata
    ? [{ label: "Provider metadata", value: validation.metadata }]
    : []),
  ...validation.logs.map((log) => ({
    label: `${log.level} · ${new Date(log.at).toISOString()} · ${log.index + 1}`,
    value: log.value,
  })),
];

export function ValidationDetail({
  validation,
}: {
  readonly validation: EvalValidation;
}) {
  const [pane, setPane] = useState<Pane>("result");
  const judgment = validation.judgment;

  return (
    <div className="flex flex-col gap-3">
      <PageTabs
        onChange={setPane}
        options={[
          { Icon: BracketsCurlyIcon, label: "Result", value: "result" },
          {
            Icon: ListMagnifyingGlassIcon,
            label: "Evidence",
            value: "evidence",
          },
          { Icon: SignInIcon, label: "Execution", value: "execution" },
        ]}
        value={pane}
      />

      {pane === "result" ? (
        <div className="min-w-0">
          {judgment ? (
            <div className="space-y-3 text-sm leading-relaxed [overflow-wrap:anywhere]">
              <p className="text-muted-foreground text-xs">
                {judgment.score === null
                  ? "Unscored"
                  : `Score ${judgment.score}`}{" "}
                · required ≥ {judgment.threshold} · {judgment.model}
                {judgment.choice === null ? "" : ` · ${judgment.choice}`}
              </p>
              <MarkdownProse
                className={
                  judgment.error === null
                    ? "text-foreground/90"
                    : "text-destructive"
                }
                text={judgment.error ?? judgment.reason}
              />
            </div>
          ) : (
            <dl>
              <Value label="Return value" value={validation.output} />
            </dl>
          )}

          {validation.error ? (
            <dl>
              <Value label="Error" value={validation.error} />
            </dl>
          ) : null}
        </div>
      ) : null}

      {pane === "evidence" ? (
        <div className="min-w-0">
          <ReadEvidence validation={validation} />
        </div>
      ) : null}

      {pane === "execution" ? (
        <div className="min-w-0 space-y-1">
          {executionRows(validation).map(({ label, value }) => (
            <Value disclosure key={label} label={label} value={value} />
          ))}
        </div>
      ) : null}

      {validation.truncated ? (
        <p className="text-warning text-xs">Some evidence was truncated.</p>
      ) : null}
    </div>
  );
}
