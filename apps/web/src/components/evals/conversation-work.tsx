import { labelOf } from "@anpord/schema/domain/eval-journal";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@anpord/ui/components/ai-elements/task";
import { CirclesFourIcon } from "@phosphor-icons/react";
import { ConversationStep } from "@/components/evals/conversation-step";
import { KindIcon } from "@/components/evals/kind-icon";
import {
  type ConversationStep as Step,
  stepFailed,
  summaryOf,
} from "@/lib/evals/conversation";

function WorkItem({ step }: { readonly step: Step }) {
  if (step._tag !== "fileChange") {
    return <ConversationStep call={step} />;
  }

  return (
    <span className="flex items-center gap-2 text-muted-foreground text-sm">
      <KindIcon kind="fileChange" />
      <span className="shrink-0">Wrote</span>
      <span className="min-w-0 truncate font-mono text-foreground text-xs">
        {step.paths.join(", ")}
      </span>
    </span>
  );
}

const titleOf = (steps: readonly Step[], live: boolean) => {
  const failed = steps.filter(stepFailed).length;
  const latest = steps.at(-1);
  const summary =
    failed === 0 ? summaryOf(steps) : `${summaryOf(steps)}, ${failed} failed`;

  return live && latest !== undefined
    ? `${summary} · ${labelOf(latest)}`
    : summary;
};

export function ConversationWork({
  live,
  steps,
}: {
  readonly live: boolean;
  readonly steps: readonly Step[];
}) {
  return (
    <Task>
      <TaskTrigger
        className={
          live ? "animate-pulse motion-reduce:animate-none" : undefined
        }
        icon={CirclesFourIcon}
        title={titleOf(steps, live)}
      />
      <TaskContent>
        {steps.map((step, index) => (
          <TaskItem key={`${step._tag}-${index.toString()}`}>
            <WorkItem step={step} />
          </TaskItem>
        ))}
      </TaskContent>
    </Task>
  );
}
