import { Button } from "@anpord/ui/components/button";
import { Input } from "@anpord/ui/components/input";
import { Label } from "@anpord/ui/components/ui/label";
import { PlayIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { EditableTask } from "@/components/evals/use-playground";

const PROVIDERS = ["daytona", "e2b"] as const;

const TaskRow = ({
  index,
  onChange,
  onRemove,
  removable,
  task,
}: {
  readonly index: number;
  readonly onChange: (task: EditableTask) => void;
  readonly onRemove: () => void;
  readonly removable: boolean;
  readonly task: EditableTask;
}) => (
  <div className="flex items-end gap-2">
    <div className="grid flex-1 gap-2">
      <Label htmlFor={`task-model-${index}`}>Model</Label>
      <Input
        id={`task-model-${index}`}
        onChange={(event) => onChange({ ...task, model: event.target.value })}
        value={task.model}
      />
    </div>

    <div className="grid w-36 gap-2">
      <Label htmlFor={`task-provider-${index}`}>Sandbox</Label>
      <select
        className="h-9 rounded-md border bg-background px-3 text-sm"
        id={`task-provider-${index}`}
        onChange={(event) =>
          onChange({ ...task, provider: event.target.value as "daytona" })
        }
        value={task.provider}
      >
        {PROVIDERS.map((provider) => (
          <option key={provider} value={provider}>
            {provider}
          </option>
        ))}
      </select>
    </div>

    {removable ? (
      <Button
        aria-label={`Remove task ${index + 1}`}
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <TrashIcon />
      </Button>
    ) : null}
  </div>
);

/**
 * The bar above the grid: a prompt, the tasks it runs as, and how many times.
 *
 * A second task is the comparison. Everything else on this screen exists to
 * make one column meaningful; the second column is what makes it an answer to
 * "which should we use".
 */
export function ConfigBar({
  onAddTask,
  onPromptChange,
  onRun,
  onTaskChange,
  onTaskRemove,
  onTrialsChange,
  prompt,
  running,
  tasks,
  trials,
}: {
  readonly onAddTask: () => void;
  readonly onPromptChange: (prompt: string) => void;
  readonly onRun: () => void;
  readonly onTaskChange: (index: number, task: EditableTask) => void;
  readonly onTaskRemove: (index: number) => void;
  readonly onTrialsChange: (trials: number) => void;
  readonly prompt: string;
  readonly running: boolean;
  readonly tasks: readonly EditableTask[];
  readonly trials: number;
}) {
  return (
    <div className="space-y-5 rounded-lg border p-4">
      <div className="grid gap-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Input
          id="prompt"
          onChange={(event) => onPromptChange(event.target.value)}
          value={prompt}
        />
        <p className="text-muted-foreground text-xs">
          Resolved for every case, so one prompt covers a whole set.{" "}
          <code>{"{{goal}}"}</code> is the case's own goal.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">Tasks</span>
          <Button onClick={onAddTask} size="sm" type="button" variant="ghost">
            <PlusIcon />
            Add task
          </Button>
        </div>

        {tasks.map((task, index) => (
          <TaskRow
            index={index}
            key={task.id}
            onChange={(next) => onTaskChange(index, next)}
            onRemove={() => onTaskRemove(index)}
            removable={tasks.length > 1}
            task={task}
          />
        ))}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="grid w-32 gap-2">
          <Label htmlFor="trials">Runs per case</Label>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            id="trials"
            onChange={(event) => onTrialsChange(Number(event.target.value))}
            value={trials}
          >
            {[1, 3, 5].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

        <Button disabled={running} onClick={onRun} type="button">
          <PlayIcon weight="fill" />
          {running ? "Running" : "Run"}
        </Button>
      </div>
    </div>
  );
}
