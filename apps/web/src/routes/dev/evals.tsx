import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import {
  FlaskIcon,
  PulseIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CELL,
  CELL_NO_BASELINE,
  RUNS,
  TASK,
  TRIALS,
} from "@/components/dev/eval-fixtures";
import { PreviewCellRail } from "@/components/dev/preview-cell-rail";
import { PreviewRunRail } from "@/components/dev/preview-run-rail";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { CellRow } from "@/components/evals/cell-row";
import { CellSetup } from "@/components/evals/cell-setup";
import { CellVerdictNote } from "@/components/evals/cell-verdict-note";
import { EvalForm } from "@/components/evals/eval-form";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { EvalRow } from "@/components/evals/eval-row";
import { TrialRail } from "@/components/evals/trial-rail";
import { TrialTable } from "@/components/evals/trial-table";
import { Waterfall } from "@/components/evals/waterfall";
import { RowList } from "@/components/layout/row-list";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/evals")({
  component: EvalsPreview,
});

const RUN_ID = RUNS[0]?.id ?? "";
const CELLS = [CELL, CELL_NO_BASELINE];
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
            <EvalForm
              onSubmit={(draft) => {
                globalThis.console.log("draft", draft);

                return Promise.resolve();
              }}
              submitting={false}
            />
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
                <PageHeading icon={SquaresFourIcon} title="Cases" />
                <RowList>
                  {CELLS.map((cell) => (
                    <div key={cell.cellKey}>
                      <CellRow cell={cell} runId={RUN_ID} task={TASK} />
                      <CellVerdictNote cell={cell} />
                    </div>
                  ))}
                </RowList>
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
                      runId: RUN_ID,
                      trials: TRIALS,
                    },
                  ]}
                />
              </section>

              {CELL.setup === null ? null : (
                <section className="flex flex-col gap-1.5">
                  <PageHeading icon={SlidersHorizontalIcon} title="Setup" />
                  <CellSetup setup={CELL.setup} />
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
