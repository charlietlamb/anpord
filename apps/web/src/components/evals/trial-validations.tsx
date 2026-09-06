import type {
  EvalValidation,
  ValidationValue,
} from "@anpord/schema/domain/eval-validations";
import { cn } from "@anpord/ui/lib/utils";
import {
  BrainIcon,
  CheckSquareIcon,
  CodeIcon,
  TerminalIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { EvidenceValue } from "./evidence-value";
import { SetupSurface } from "./setup-surface";
import { SignalTip } from "./signal-tip";

const views = ["Output", "Input", "Calls", "Logs", "Metadata"] as const;
const kindIcons = { code: CodeIcon, judge: BrainIcon, command: TerminalIcon };

function Evidence({
  validation,
  view,
}: {
  readonly validation: EvalValidation;
  readonly view: (typeof views)[number];
}) {
  switch (view) {
    case "Input":
      return <Value label="Input" value={validation.input} />;
    case "Metadata":
      return validation.metadata ? (
        <Value label="Provider metadata" value={validation.metadata} />
      ) : (
        <p className="px-3.5 py-3 text-muted-foreground text-xs">
          No provider metadata recorded.
        </p>
      );
    case "Logs":
      return validation.logs.length === 0 ? (
        <p className="px-3.5 py-3 text-muted-foreground text-xs">
          No logs recorded.
        </p>
      ) : (
        validation.logs.map((log) => (
          <Value
            key={log.index}
            label={`${log.level} · ${new Date(log.at).toISOString()}`}
            value={log.value}
          />
        ))
      );
    case "Calls":
      return validation.calls.length === 0 ? (
        <p className="px-3.5 py-3 text-muted-foreground text-xs">
          No context calls recorded.
        </p>
      ) : (
        validation.calls.map((call) => (
          <div className="border-border-faint border-t" key={call.index}>
            <dt className="px-3.5 pt-3 font-mono text-xs">
              {call.method} ·{" "}
              {call.durationMs === null ? "Incomplete" : `${call.durationMs}ms`}
            </dt>
            <dd>
              <dl className="grid md:grid-cols-2">
                <Value label="Arguments" value={call.input} />
                <Value label="Result" value={call.output} />
                {call.error ? <Value label="Error" value={call.error} /> : null}
              </dl>
            </dd>
          </div>
        ))
      );
    default:
      return <Value label="Return value" value={validation.output} />;
  }
}

function Value({
  label,
  value,
}: {
  readonly label: string;
  readonly value: ValidationValue;
}) {
  return value.state === "captured" ? (
    <EvidenceValue
      label={label}
      truncated={value.truncated}
      value={value.text}
    />
  ) : (
    <div className="px-3.5 py-2.5 text-muted-foreground text-xs">
      <dt>{label}</dt>
      <dd>
        {value.state === "disabled" ? "Capture disabled" : "Not recorded"}
      </dd>
    </div>
  );
}

function ValidationRow({
  validation,
}: {
  readonly validation: EvalValidation;
}) {
  const [view, setView] = useState<(typeof views)[number]>("Output");
  const KindIcon = kindIcons[validation.kind];
  const failed =
    validation.status === "failed" || validation.status === "error";
  return (
    <details open={failed}>
      <summary className="flex cursor-pointer items-center gap-2 px-3.5 py-3 text-xs hover:bg-muted/40">
        <span className="min-w-0 flex-1 truncate font-mono">
          {validation.name}
        </span>
        <SignalTip label={validation.kind}>
          <KindIcon
            aria-label={validation.kind}
            className="size-3.5 shrink-0 text-muted-foreground"
            role="img"
          />
        </SignalTip>
        {validation.durationMs === null ? null : (
          <span className="text-muted-foreground tabular-nums">
            {validation.durationMs}ms
          </span>
        )}
        <span
          className={cn(
            "rounded px-1.5 py-0.5",
            "text-muted-foreground",
            failed && "bg-destructive/10 text-destructive",
            validation.status === "passed" && "bg-success/10 text-success"
          )}
        >
          {validation.status}
        </span>
      </summary>
      <div className="border-border-faint border-t">
        {validation.message ? (
          <p className="px-3.5 pt-3 text-xs">{validation.message}</p>
        ) : null}
        {validation.judgment ? (
          <p className="px-3.5 pt-2 text-muted-foreground text-xs">
            {validation.judgment.model} ·{" "}
            {validation.judgment.choice ?? "Unscored"} · score{" "}
            {validation.judgment.score ?? "unavailable"} · threshold{" "}
            {validation.judgment.threshold}
          </p>
        ) : null}
        {validation.error ? (
          <dl>
            <Value label="Error" value={validation.error} />
          </dl>
        ) : null}
        <nav
          aria-label={`Evidence for ${validation.name}`}
          className="flex gap-1 px-3.5 py-2"
        >
          {views.map((item) => (
            <button
              aria-pressed={view === item}
              className={cn(
                "rounded px-2 py-1 text-xs",
                view === item
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
              key={item}
              onClick={() => setView(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
        <dl>
          <Evidence validation={validation} view={view} />
        </dl>
        {validation.truncated ? (
          <p className="px-3.5 pb-3 text-warning text-xs">
            Some evidence was truncated.
          </p>
        ) : null}
      </div>
    </details>
  );
}

export function TrialValidations({
  validations,
}: {
  readonly validations?: readonly EvalValidation[];
}) {
  return (
    <SetupSurface
      contentClassName="p-0"
      Icon={CheckSquareIcon}
      title="Validation results"
    >
      {validations === undefined || validations.length === 0 ? (
        <p className="px-3.5 py-3 text-muted-foreground text-xs">
          Execution evidence was not recorded for this trial.
        </p>
      ) : (
        <div className="divide-y divide-border-faint">
          {validations.map((validation) => (
            <ValidationRow key={validation.id} validation={validation} />
          ))}
        </div>
      )}
    </SetupSurface>
  );
}
