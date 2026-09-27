import type { EvalRun } from "@anpord/schema/domain/evals";
import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import { RUN } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { RunView } from "@/components/evals/run-view";

export const Route = createFileRoute("/dev/run")({
  component: RunPreview,
  ssr: false,
});

const STATES: readonly { readonly name: string; readonly run: EvalRun }[] = [
  {
    name: "running, before any trial opens",
    run: { ...RUN, finishedAt: null, status: "running", trials: [] },
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
            <RunView caseId={state.run.case.id} run={state.run} />
          </PreviewScreen>
        ))}
      </div>
    </TooltipProvider>
  );
}
