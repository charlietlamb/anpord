import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { DataTableSkeleton } from "@anpord/ui/components/ui/data-table";
import { createFileRoute } from "@tanstack/react-router";
import { TRIALS } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import {
  VALIDATED_SETUP,
  VALIDATED_TRIAL,
} from "@/components/dev/trial-fixtures";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialChecks } from "@/components/evals/trial-checks";
import { TrialSkeleton } from "@/components/evals/trial-skeleton";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  CALLS_TABLE,
  CASES_TABLE,
  CHECKS_TABLE,
} from "@/lib/evals/case-tables";
import { PROMPTS_TABLE } from "@/lib/prompts/prompt-tables";
import { CONNECTIONS_TABLE } from "@/lib/settings/settings-tables";

export const Route = createFileRoute("/dev/skeletons")({
  component: SkeletonsPreview,
});

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
            <TrialChecks setup={VALIDATED_SETUP} trial={VALIDATED_TRIAL} />
          }
          name="Checks"
          skeleton={<DataTableSkeleton {...CHECKS_TABLE} rows={2} />}
        />

        <PreviewScreen name="Cases table">
          <div className="mx-auto w-full max-w-5xl px-5 xl:px-6">
            <DataTableSkeleton {...CASES_TABLE} />
          </div>
        </PreviewScreen>

        <PreviewScreen name="Prompt list">
          <div className="mx-auto w-full max-w-5xl px-5 xl:px-6">
            <DataTableSkeleton {...PROMPTS_TABLE} />
          </div>
        </PreviewScreen>

        <PreviewScreen name="Connection list">
          <div className="mx-auto w-full max-w-5xl px-5 xl:px-6">
            <DataTableSkeleton {...CONNECTIONS_TABLE} rows={2} />
          </div>
        </PreviewScreen>

        {TRIAL ? (
          <PreviewScreen name="Trial page">
            <div data-probe="skeleton">
              <TrialSkeleton />
            </div>
          </PreviewScreen>
        ) : null}

        {TRIAL ? (
          <Pair
            loaded={<TrialCalls trajectory={TRIAL.trajectory} />}
            name="Calls"
            skeleton={<DataTableSkeleton {...CALLS_TABLE} rows={4} />}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
