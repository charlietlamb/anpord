import { elapsed, seconds } from "@anpord/ui/lib/evals/duration";
import type { ReactNode } from "react";
import { StepDetailBody } from "@/components/evals/step-detail-body";
import { StepProperties } from "@/components/evals/step-properties";
import { StepResult } from "@/components/evals/step-result";
import { VerbBadge } from "@/components/evals/verb-badge";
import type {
  TimelineSection,
  TimelineStep,
} from "@/lib/evals/timeline-sections";

export function StepDetail({
  section,
  step,
  thinkingMs,
}: {
  readonly section: TimelineSection;
  readonly step: TimelineStep;
  readonly thinkingMs: number | null;
}) {
  const rows: (readonly [string, ReactNode])[] = [
    [
      "Kind",
      <VerbBadge failed={step.failed} key="kind" verb={step.title.verb} />,
    ],
  ];
  const result = <StepResult entry={step.entry} />;

  if (step.entry._tag === "command" || step.entry._tag === "toolCall") {
    rows.push(["Result", result]);
  }
  if (step.offsetMs !== null) {
    rows.push(["Started", elapsed(step.offsetMs)]);
  }
  if (thinkingMs !== null) {
    rows.push(["Thinking", seconds(thinkingMs)]);
  }
  if (step.durationMs !== null) {
    rows.push(["Ran for", seconds(step.durationMs)]);
  }
  if (section.steps[0] !== step) {
    rows.push([
      "Section",
      <span className="truncate text-muted-foreground" key="section">
        {section.title.title}
      </span>,
    ]);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4">
      <h3 className="font-medium text-lg/snug tracking-[-0.015em]">
        {step.title.title}
      </h3>
      <StepProperties rows={rows} />
      <div className="h-px shrink-0 bg-border" />
      <StepDetailBody entry={step.entry} />
    </div>
  );
}
