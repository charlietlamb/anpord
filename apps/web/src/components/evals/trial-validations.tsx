import type {
  EvalValidation,
  ValidationValue,
} from "@anpord/schema/domain/eval-validations";
import { cn } from "@anpord/ui/lib/utils";
import {
  BrainIcon,
  CaretRightIcon,
  CodeIcon,
  TerminalIcon,
} from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { seconds } from "@/lib/evals/duration";
import {
  judgeInput,
  validationKey,
  validationSummary,
} from "@/lib/evals/validation-results";
import { EvidenceValue } from "./evidence-value";
import { MarkdownProse } from "./markdown-prose";
import { SignalTip } from "./signal-tip";

const kindIcons = { code: CodeIcon, judge: BrainIcon, command: TerminalIcon };
const DISCLOSURE =
  "cursor-pointer py-2 text-muted-foreground text-xs hover:text-foreground focus-visible:outline-ring";

function Value({
  value,
  ...props
}: Omit<ComponentProps<typeof EvidenceValue>, "value"> & {
  readonly value: ValidationValue;
}) {
  return (
    <EvidenceValue
      {...props}
      truncated={value.state === "captured" && value.truncated}
      unavailable={
        value.state === "disabled" ? "Capture disabled" : "Not recorded"
      }
      value={value.state === "captured" ? value.text : undefined}
    />
  );
}

function ReadEvidence({ validation }: { readonly validation: EvalValidation }) {
  const fields =
    validation.kind === "judge" ? judgeInput(validation.input) : null;
  if (fields) {
    return fields.map(({ label, value }, index) =>
      index === 0 ? (
        <dl key={label}>
          <EvidenceValue label={label} value={value} />
        </dl>
      ) : (
        <EvidenceValue disclosure key={label} label={label} value={value} />
      )
    );
  }
  if (validation.kind === "code") {
    if (validation.calls.length === 0) {
      return (
        <p className="py-2 text-muted-foreground text-xs">
          {validation.input.state === "disabled"
            ? "Capture disabled"
            : "No context reads recorded"}
        </p>
      );
    }
    return validation.calls.map((call, index) => (
      <Value
        disclosure
        key={call.index}
        label={`${call.method}() · ${call.durationMs === null ? "Incomplete" : seconds(call.durationMs)}`}
        open={index === 0}
        value={call.output}
      >
        {call.error ? (
          <dl>
            <Value label="Error" value={call.error} />
          </dl>
        ) : null}
        <Value disclosure label="Arguments" value={call.input} />
      </Value>
    ));
  }

  return (
    <dl>
      <Value
        label={validation.kind === "judge" ? "Request" : "Invocation input"}
        value={validation.input}
      />
    </dl>
  );
}

function ValidationRow({
  validation,
  expanded,
}: {
  readonly validation: EvalValidation;
  readonly expanded: boolean;
}) {
  const KindIcon = kindIcons[validation.kind];
  const failed =
    validation.status === "failed" || validation.status === "error";
  const judgment = validation.judgment;
  return (
    <details
      className="group/validation overflow-hidden rounded-xl border border-border-faint bg-muted/40 transition-colors hover:border-muted-foreground/40"
      open={expanded}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-2.5 text-xs">
          <SignalTip label={validation.kind}>
            <KindIcon
              aria-label={validation.kind}
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              role="img"
            />
          </SignalTip>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="min-w-0 flex-1 basis-40 break-words font-medium font-mono text-sm">
              {validation.name}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {judgment?.score == null ? null : (
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  Score {judgment.score}
                </span>
              )}
              {validation.durationMs === null ? null : (
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {seconds(validation.durationMs)}
                </span>
              )}
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-muted-foreground",
                  failed && "bg-destructive/10 text-destructive",
                  validation.status === "passed" && "bg-success/10 text-success"
                )}
              >
                {validation.status}
              </span>
            </span>
          </div>
          <CaretRightIcon
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-open/validation:rotate-90"
          />
        </div>
        <p className="mt-2 line-clamp-2 pl-6.5 text-muted-foreground text-xs leading-relaxed group-open/validation:hidden">
          {validationSummary(validation)}
        </p>
      </summary>
      <div className="border-border-faint border-t bg-background/50 p-4">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            {judgment ? (
              <h4 className="pt-2 font-medium text-muted-foreground text-xs">
                Judge result
              </h4>
            ) : null}
            {judgment ? (
              <div className="space-y-3 py-2 text-sm leading-relaxed [overflow-wrap:anywhere]">
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
          <div className="min-w-0 border-border-faint border-t pt-3">
            <ReadEvidence validation={validation} />
          </div>
        </div>
        <details className="mt-3 border-border-faint border-t pt-1">
          <summary className={DISCLOSURE}>Execution details</summary>
          <div className="space-y-1">
            {[
              { label: "Invocation input", value: validation.input },
              ...(judgment
                ? [{ label: "Raw response", value: validation.output }]
                : []),
              ...(validation.metadata
                ? [{ label: "Provider metadata", value: validation.metadata }]
                : []),
              ...validation.logs.map((log) => ({
                label: `${log.level} · ${new Date(log.at).toISOString()} · ${log.index + 1}`,
                value: log.value,
              })),
            ].map(({ label, value }) => (
              <Value disclosure key={label} label={label} value={value} />
            ))}
          </div>
        </details>
        {validation.truncated ? (
          <p className="pt-2 text-warning text-xs">
            Some evidence was truncated.
          </p>
        ) : null}
      </div>
    </details>
  );
}

export function TrialValidations({
  validations,
  expandedKey,
}: {
  readonly expandedKey?: string | null;
  readonly validations?: readonly EvalValidation[];
}) {
  if (!validations?.length) {
    return (
      <p className="py-3 text-muted-foreground text-xs">
        Execution evidence was not recorded for this trial.
      </p>
    );
  }
  const first = validations.find((validation) =>
    expandedKey
      ? validationKey(validation) === expandedKey
      : validation.status === "failed" || validation.status === "error"
  );
  return (
    <div className="space-y-3">
      {validations.map((validation) => (
        <ValidationRow
          expanded={validation === first}
          key={validation.id}
          validation={validation}
        />
      ))}
    </div>
  );
}
