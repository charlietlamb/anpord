import { CirclesFourIcon } from "@phosphor-icons/react";
import { labelOf } from "@sphynx/schema/domain/eval-journal";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@sphynx/ui/components/ai-elements/task";
import { ConversationWorkItem } from "@/components/evals/conversation-work-item";
import {
  type ConversationStep as Step,
  stepFailed,
  summaryOf,
} from "@/lib/evals/conversation";
import { journalKey } from "@/lib/evals/journal-presentation";

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
  onOpenChange,
  open,
  steps,
}: {
  readonly live: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly steps: readonly Step[];
}) {
  return (
    <Task onOpenChange={onOpenChange} open={open}>
      <TaskTrigger
        className={
          live ? "animate-pulse motion-reduce:animate-none" : undefined
        }
        icon={CirclesFourIcon}
        title={titleOf(steps, live)}
      />
      <TaskContent>
        {steps.map((step, index) => (
          <TaskItem key={journalKey(step, index)}>
            <ConversationWorkItem step={step} />
          </TaskItem>
        ))}
      </TaskContent>
    </Task>
  );
}
