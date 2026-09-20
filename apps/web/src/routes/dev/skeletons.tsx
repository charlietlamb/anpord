import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import { CELL, RUN, RUNS, TRIALS } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { VALIDATION_TRIALS } from "@/components/dev/validation-fixtures";
import { EvalRow } from "@/components/evals/eval-row";
import { EvalListSkeleton } from "@/components/evals/eval-row-skeleton";
import { RunGrid } from "@/components/evals/run-grid";
import { RunGridSkeleton } from "@/components/evals/run-grid-skeleton";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialCallsSkeleton } from "@/components/evals/trial-calls-skeleton";
import { TrialListSkeleton } from "@/components/evals/trial-row-skeleton";
import { TrialSkeleton } from "@/components/evals/trial-skeleton";
import { TrialTable } from "@/components/evals/trial-table";
import { ValidationInspector } from "@/components/evals/validation-inspector";
import { ValidationInspectorSkeleton } from "@/components/evals/validation-inspector-skeleton";
import { RowList } from "@/components/layout/row-list";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PromptListSkeleton } from "@/components/prompts/prompt-list-skeleton";

export const Route = createFileRoute("/dev/skeletons")({
  component: SkeletonsPreview,
});

/* Each skeleton sits directly above the thing it stands in for, so a row that
   settles when data lands shows up as a step between the two. */
function Pair({
  loaded,
  name,
  skeleton,
}: {
  readonly loaded: React.ReactNode;
  readonly name: string;
  readonly skeleton: React.ReactNode;
}) {
  return (
    <PreviewScreen name={name}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-6 xl:px-6">
        <div data-probe="skeleton">{skeleton}</div>
        <div data-probe="loaded">{loaded}</div>
      </div>
    </PreviewScreen>
  );
}

const TRIAL = TRIALS.find((candidate) => candidate.trajectory.length > 0);

function SkeletonsPreview() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 py-6">
        <div className="mx-auto flex w-full max-w-5xl justify-end px-5">
          <ThemeToggle />
        </div>

        <Pair
          loaded={
            <RowList>
              {RUNS.slice(0, 5).map((run) => (
                <EvalRow key={run.id} run={run} />
              ))}
            </RowList>
          }
          name="Eval list"
          skeleton={<EvalListSkeleton />}
        />

        <Pair
          loaded={
            <TrialTable
              cellKey={CELL.cellKey ?? "cell"}
              runId={RUN.id}
              trials={CELL.trials}
            />
          }
          name="Trial list"
          skeleton={<TrialListSkeleton />}
        />

        <Pair
          loaded={<RunGrid run={RUN} />}
          name="Run grid"
          skeleton={<RunGridSkeleton />}
        />

        <Pair
          loaded={<ValidationInspector trials={VALIDATION_TRIALS} />}
          name="Validation"
          skeleton={<ValidationInspectorSkeleton />}
        />

        <Pair
          loaded={
            <RowList>
              {RUNS.slice(0, 3).map((run) => (
                <EvalRow key={run.id} run={run} />
              ))}
            </RowList>
          }
          name="Prompt list (shared SkeletonRows)"
          skeleton={<PromptListSkeleton />}
        />

        {TRIAL ? (
          <PreviewScreen name="Trial page">
            <div data-probe="skeleton">
              <TrialSkeleton ordinal="1" />
            </div>
          </PreviewScreen>
        ) : null}

        {TRIAL ? (
          <Pair
            loaded={<TrialCalls trajectory={TRIAL.trajectory} />}
            name="Calls"
            skeleton={<TrialCallsSkeleton />}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
