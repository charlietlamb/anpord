import { Button } from "@anpord/ui/components/button";
import { PageTabs } from "@anpord/ui/components/ui/page-tabs";
import { XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { StepDetail } from "@/components/evals/step-detail";
import { StepDetailBody } from "@/components/evals/step-detail-body";
import { StepNav } from "@/components/evals/step-nav";
import type {
  TimelineSection,
  TimelineStep,
} from "@/lib/evals/timeline-sections";

type PaneTab = "overview" | "input" | "output";

export function StepPane({
  count,
  onClose,
  onStep,
  section,
  step,
  thinkingMs,
}: {
  readonly count: number;
  readonly onClose: () => void;
  readonly onStep: (step: number) => void;
  readonly section: TimelineSection;
  readonly step: TimelineStep;
  readonly thinkingMs: number | null;
}) {
  const [tab, setTab] = useState<PaneTab>("overview");
  const tabs = tabsFor(step);
  const shown = tabs.some((option) => option.value === tab) ? tab : "overview";

  return (
    <aside
      aria-label="Step"
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
        <PageTabs onChange={setTab} options={tabs} value={shown} />
        <span className="flex items-center gap-0.5">
          <StepNav count={count} onStep={onStep} step={step.index} />
          <Button
            aria-label="Close step"
            onClick={onClose}
            size="icon-xs"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <p className="text-muted-foreground text-xs tabular-nums">
          Step {step.index + 1} of {count}
        </p>
        {shown === "overview" ? (
          <StepDetail section={section} step={step} thinkingMs={thinkingMs} />
        ) : (
          <StepDetailBody entry={step.entry} part={shown} />
        )}
      </div>
    </aside>
  );
}

const tabsFor = ({ entry }: TimelineStep) => {
  const overview = { label: "Overview", value: "overview" as const };

  if (entry._tag !== "command" && entry._tag !== "toolCall") {
    return [overview];
  }

  return [
    overview,
    {
      label: entry._tag === "command" ? "Command" : "Parameters",
      value: "input" as const,
    },
    { label: "Result", value: "output" as const },
  ];
};
