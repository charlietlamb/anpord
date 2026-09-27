import type { EvalJournalEntry } from "@anpord/schema/domain/eval-trial";
import type { EvalRun } from "@anpord/schema/domain/evals";
import { AgeCell } from "@anpord/ui/components/evals/age-cell";
import { EvalStatusBadge } from "@anpord/ui/components/evals/eval-status-badge";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { EmptyNote } from "@anpord/ui/components/ui/empty-note";
import { runStatus } from "@anpord/ui/lib/evals/eval-status";
import { RunTrialRow } from "@/components/evals/run-trial-row";
import { TrialTimeline } from "@/components/evals/trial-timeline";
import { PageShell } from "@/components/layout/page-shell";
import { CASE_RUNS_TABLE } from "@/lib/evals/case-tables";

const liveSteps = (run: EvalRun, trajectory: readonly EvalJournalEntry[]) => {
  if (trajectory.length > 0) {
    return (
      <TrialTimeline
        running={run.status === "running"}
        timed={trajectory.some((entry) => entry.finishedAtMillis !== null)}
        trajectory={trajectory}
      />
    );
  }

  return (
    <EmptyNote>
      {run.status === "running"
        ? "Waiting for the agent to take its first step."
        : "This run finished without opening a trial."}
    </EmptyNote>
  );
};

export function RunView({
  caseId,
  run,
  trajectory,
}: {
  readonly caseId: string;
  readonly run: EvalRun;
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  return (
    <PageShell
      description={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-sm">
          <EvalStatusBadge size="xs" status={runStatus(run)} />

          <span className="flex items-center gap-1">
            Started <AgeCell at={run.startedAt.epochMillis} />
          </span>
        </span>
      }
      title={run.case.name}
      width="wide"
    >
      {run.trials.length === 0 ? (
        liveSteps(run, trajectory)
      ) : (
        <DataTable
          columns={CASE_RUNS_TABLE.columns}
          label={CASE_RUNS_TABLE.label}
        >
          <DataTableHead headings={CASE_RUNS_TABLE.headings} />

          <DataTableBody>
            {run.trials.map((trial) => (
              <RunTrialRow
                caseId={caseId}
                key={trial.id}
                run={run}
                trial={trial}
              />
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </PageShell>
  );
}
