import type { EvalBatch } from "@sphynx/schema/domain/evals";
import {
  BatchRunRow,
  type RunLink,
  type TrialLink,
} from "@sphynx/ui/components/evals/batch-run-row";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@sphynx/ui/components/ui/data-table";
import { EmptyNote } from "@sphynx/ui/components/ui/empty-note";
import { BATCH_RUNS_TABLE } from "@sphynx/ui/lib/evals/batch-runs-table";
import { counted } from "@sphynx/ui/lib/evals/counted";

const settledOf = (batch: EvalBatch) =>
  batch.runs.filter((run) => run.status !== "running").length;

export function BatchRuns({
  batch,
  linkTo,
  runLinkTo,
}: {
  readonly batch: EvalBatch;
  readonly linkTo?: TrialLink;
  readonly runLinkTo?: RunLink;
}) {
  if (batch.runs.length === 0) {
    return (
      <EmptyNote>
        {batch.status === "running"
          ? "Waiting for the first run to start."
          : "This batch holds no runs."}
      </EmptyNote>
    );
  }

  return (
    <DataTable
      columns={BATCH_RUNS_TABLE.columns}
      label={BATCH_RUNS_TABLE.label}
    >
      <DataTableHead headings={BATCH_RUNS_TABLE.headings} />

      <DataTableBody>
        {batch.runs.map((run) => (
          <BatchRunRow
            key={run.id}
            linkTo={linkTo}
            run={run}
            runLinkTo={runLinkTo}
          />
        ))}
      </DataTableBody>

      <DataTableFooter>
        {settledOf(batch)} of {counted(batch.runs.length, "run", "runs")}{" "}
        finished
      </DataTableFooter>
    </DataTable>
  );
}
