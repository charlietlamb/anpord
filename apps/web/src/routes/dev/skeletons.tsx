import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { DataTableSkeleton } from "@anpord/ui/components/ui/data-table";
import { createFileRoute } from "@tanstack/react-router";
import { TRIALS } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { VALIDATION_TRIALS } from "@/components/dev/validation-fixtures";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialCallsSkeleton } from "@/components/evals/trial-calls-skeleton";
import { TrialSkeleton } from "@/components/evals/trial-skeleton";
import { ValidationInspector } from "@/components/evals/validation-inspector";
import { ValidationInspectorSkeleton } from "@/components/evals/validation-inspector-skeleton";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PromptListSkeleton } from "@/components/prompts/prompt-list-skeleton";
import { ConnectionListSkeleton } from "@/components/settings/connection-list-skeleton";
import { CASES_TABLE } from "@/lib/evals/case-tables";

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
          loaded={<ValidationInspector trials={VALIDATION_TRIALS} />}
          name="Validation"
          skeleton={<ValidationInspectorSkeleton />}
        />

        <PreviewScreen name="Cases table">
          <div className="mx-auto w-full max-w-5xl px-5 xl:px-6">
            <DataTableSkeleton {...CASES_TABLE} />
          </div>
        </PreviewScreen>

        <PreviewScreen name="Prompt list">
          <div className="mx-auto w-full max-w-5xl px-5 xl:px-6">
            <PromptListSkeleton />
          </div>
        </PreviewScreen>

        <PreviewScreen name="Connection list">
          <div className="mx-auto w-full max-w-5xl px-5 xl:px-6">
            <ConnectionListSkeleton />
          </div>
        </PreviewScreen>

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
