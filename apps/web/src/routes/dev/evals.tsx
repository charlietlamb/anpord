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
  TRIALS,
} from "@/components/dev/eval-fixtures";
import { CellRail } from "@/components/evals/cell-rail";
import { CellRow } from "@/components/evals/cell-row";
import { CellSetup } from "@/components/evals/cell-setup";
import { CellVerdictNote } from "@/components/evals/cell-verdict-note";
import { EvalForm } from "@/components/evals/eval-form";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { EvalRow } from "@/components/evals/eval-row";
import { RunRail } from "@/components/evals/run-rail";
import { TrialRail } from "@/components/evals/trial-rail";
import { TrialTable } from "@/components/evals/trial-table";
import { Waterfall } from "@/components/evals/waterfall";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/evals")({
  component: EvalsPreview,
});

const TASK = {
  harness: "codex" as const,
  harnessVersion: "0.144.4",
  model: "gpt-5-codex",
  provider: "daytona" as const,
};

const RUN_ID = RUNS[0]?.id ?? "";
const CELLS = [CELL, CELL_NO_BASELINE];
const TRIAL = TRIALS[0];

/** Each screen at the size it actually renders, so a change is judged against
 * the page rather than against a component sitting alone. */
function Screen({
  children,
  name,
}: {
  readonly children: React.ReactNode;
  readonly name: string;
}) {
  return (
    <section className="flex flex-col">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-5 py-3 xl:px-6">
        <span className="font-medium text-muted-foreground text-xs">
          {name}
        </span>
        <span className="h-px flex-1 bg-border-faint" />
      </div>
      {children}
    </section>
  );
}

function EvalsPreview() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-10 pb-24">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 xl:px-6">
          <h1 className="font-heading text-xl tracking-tight">Evals</h1>
          <ThemeToggle />
        </div>

        <Screen name="New eval">
          <div className="mx-auto w-full max-w-3xl px-5 py-5">
            <EvalForm
              onSubmit={(draft) => {
                globalThis.console.log("draft", draft);

                return Promise.resolve();
              }}
              submitting={false}
            />
          </div>
        </Screen>

        <Screen name="Runs">
          <div className="mx-auto w-full max-w-3xl px-5 xl:px-6">
            <div className="-mx-2 flex flex-col">
              {RUNS.map((run) => (
                <EvalRow key={run.id} run={run} />
              ))}
            </div>
          </div>
        </Screen>

        <Screen name="One run">
          <EvalLayout>
            <EvalMain>
              <section className="flex flex-col gap-1.5">
                <PageHeading icon={SquaresFourIcon} title="Cases" />
                <div className="-mx-2 flex flex-col">
                  {CELLS.map((cell) => (
                    <div key={cell.cellKey}>
                      <CellRow cell={cell} runId={RUN_ID} task={TASK} />
                      <CellVerdictNote cell={cell} />
                    </div>
                  ))}
                </div>
              </section>
            </EvalMain>

            <PreviewRunRail />
          </EvalLayout>
        </Screen>

        <Screen name="One cell">
          <EvalLayout>
            <EvalMain>
              <section className="flex flex-col gap-1.5">
                <PageHeading icon={FlaskIcon} title={CELL.caseName} />
                <TrialTable
                  cellKey={CELL.cellKey ?? ""}
                  runId={RUN_ID}
                  trials={TRIALS}
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
        </Screen>

        {TRIAL ? (
          <Screen name="One trial">
            <EvalLayout>
              <EvalMain>
                <section className="flex flex-col gap-1.5">
                  <PageHeading icon={PulseIcon} title="Trajectory" />
                  <Waterfall
                    timed={TRIAL.timed}
                    trajectory={TRIAL.trajectory}
                  />
                </section>
              </EvalMain>

              <TrialRail trial={TRIAL} />
            </EvalLayout>
          </Screen>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

/* The rails take a whole run, which the fixtures do not assemble, so the
   preview builds the smallest one that renders. */
function PreviewRunRail() {
  return (
    <RunRail
      run={{
        cases: [CELL.caseName, CELL_NO_BASELINE.caseName],
        cells: CELLS,
        failure: null,
        finishedAt: RUNS[0]?.finishedAt ?? null,
        id: RUN_ID,
        startedAt: RUNS[0]?.startedAt,
        status: "finished",
        tasks: [TASK],
      }}
    />
  );
}

function PreviewCellRail() {
  return <CellRail cell={CELL} cellKey={CELL.cellKey ?? ""} task={TASK} />;
}
