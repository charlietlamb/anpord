import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import {
  FlaskIcon,
  PulseIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { CatchBoundary, createFileRoute } from "@tanstack/react-router";
import {
  CELL,
  FAILED_TRIAL,
  RUN,
  RUNS,
  TRIALS,
} from "@/components/dev/eval-fixtures";
import { PreviewCellRail } from "@/components/dev/preview-cell-rail";
import { PreviewRunRail } from "@/components/dev/preview-run-rail";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { CellSetup } from "@/components/evals/cell-setup";
import { EvalForm } from "@/components/evals/eval-form";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { EvalRow } from "@/components/evals/eval-row";
import { RunGrid } from "@/components/evals/run-grid";
import { TrialRail } from "@/components/evals/trial-rail";
import { TrialTable } from "@/components/evals/trial-table";
import { Waterfall } from "@/components/evals/waterfall";
import { EmptyNote } from "@/components/layout/empty-note";
import { RowList } from "@/components/layout/row-list";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/evals")({
  component: EvalsPreview,
  ssr: false,
});

const TRIAL = TRIALS[0];

function EvalsPreview() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-10 pb-24">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 xl:px-6">
          <h1 className="font-heading text-xl tracking-tight">Evals</h1>
          <ThemeToggle />
        </div>

        <PreviewScreen name="New eval">
          <div className="mx-auto w-full max-w-3xl px-5 py-5">
            {/* The form asks the server for models and throws when nobody is
                signed in, which must not take the other previews with it. */}
            <CatchBoundary
              errorComponent={() => (
                <EmptyNote>Sign in to preview the form.</EmptyNote>
              )}
              getResetKey={() => "eval-form"}
            >
              <EvalForm
                onSubmit={(draft) => {
                  globalThis.console.log("draft", draft);

                  return Promise.resolve();
                }}
                submitting={false}
              />
            </CatchBoundary>
          </div>
        </PreviewScreen>

        <PreviewScreen name="Runs">
          <div className="mx-auto w-full max-w-3xl px-5 xl:px-6">
            <RowList>
              {RUNS.map((run) => (
                <EvalRow key={run.id} run={run} />
              ))}
            </RowList>
          </div>
        </PreviewScreen>

        <PreviewScreen name="One run">
          <EvalLayout>
            <EvalMain>
              <section className="flex flex-col gap-1.5">
                <PageHeading icon={SquaresFourIcon} title="Results" />
                <RunGrid run={RUN} />
              </section>
            </EvalMain>

            <PreviewRunRail />
          </EvalLayout>
        </PreviewScreen>

        <PreviewScreen name="One cell">
          <EvalLayout>
            <EvalMain>
              <section className="flex flex-col gap-1.5">
                <PageHeading icon={FlaskIcon} title={CELL.caseName} />
                <TrialTable
                  cellKey={CELL.cellKey ?? ""}
                  readings={[
                    {
                      internalId: "cell_preview",
                      runId: RUN.id,
                      trials: TRIALS,
                    },
                  ]}
                />
              </section>

              {CELL.setup === null ? null : (
                <section className="flex flex-col gap-1.5">
                  <PageHeading icon={SlidersHorizontalIcon} title="Setup" />
                  <CellSetup
                    setup={CELL.setup}
                    trials={[...CELL.trials, FAILED_TRIAL]}
                  />
                </section>
              )}
            </EvalMain>

            <PreviewCellRail />
          </EvalLayout>
        </PreviewScreen>

        <PreviewScreen name="A trial that has not reported yet">
          <EvalMain>
            <section className="flex flex-col gap-1.5">
              <PageHeading icon={PulseIcon} title="Trajectory" />
              <Waterfall running={true} timed={false} trajectory={[]} />
            </section>
          </EvalMain>
        </PreviewScreen>

        {TRIAL ? (
          <PreviewScreen name="One trial">
            <EvalLayout>
              <EvalMain>
                <section className="flex flex-col gap-1.5">
                  <PageHeading icon={PulseIcon} title="Trajectory" />
                  <Waterfall
                    running={false}
                    timed={TRIAL.timed}
                    trajectory={TRIAL.trajectory}
                  />
                </section>
              </EvalMain>

              <TrialRail trial={TRIAL} />
            </EvalLayout>
          </PreviewScreen>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
