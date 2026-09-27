import type { EvalJournalEntry } from "@anpord/schema/domain/eval-trial";
import type { EvalRun } from "@anpord/schema/domain/evals";
import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import { RUN } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { RUNNING_TRAJECTORY } from "@/components/dev/timeline-fixtures";
import { RunView } from "@/components/evals/run-view";

export const Route = createFileRoute("/dev/run")({
  component: RunPreview,
  ssr: false,
});

const STATES: readonly {
  readonly name: string;
  readonly run: EvalRun;
  readonly trajectory?: readonly EvalJournalEntry[];
}[] = [
  {
    name: "running, agent has not stepped yet",
    run: { ...RUN, finishedAt: null, status: "running", trials: [] },
  },
  {
    name: "running, steps arriving live before any trial row exists",
    run: { ...RUN, finishedAt: null, status: "running", trials: [] },
    trajectory: RUNNING_TRAJECTORY,
  },
  {
    name: "running, first trial open",
    run: {
      ...RUN,
      finishedAt: null,
      status: "running",
      trials: RUN.trials.slice(0, 1),
    },
  },
  { name: "finished", run: RUN },
  { name: "finished without a trial", run: { ...RUN, trials: [] } },
];

function RunPreview() {
  return (
    <TooltipProvider>
      <div className="flex flex-col">
        {STATES.map((state) => (
          <PreviewScreen key={state.name} name={state.name}>
            <RunView
              caseId={state.run.case.id}
              run={state.run}
              trajectory={state.trajectory ?? []}
            />
          </PreviewScreen>
        ))}
      </div>
    </TooltipProvider>
  );
}
