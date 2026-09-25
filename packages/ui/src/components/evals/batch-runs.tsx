import type { EvalBatch } from "@anpord/schema/domain/evals";
import {
  BatchRunRow,
  type TrialLink,
} from "@anpord/ui/components/evals/batch-run-row";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { EmptyNote } from "@anpord/ui/components/ui/empty-note";
import { BATCH_RUNS_TABLE } from "@anpord/ui/lib/evals/batch-runs-table";
import { counted } from "@anpord/ui/lib/evals/counted";

const settledOf = (batch: EvalBatch) =>
  batch.runs.filter((run) => run.status !== "running").length;

export function BatchRuns({
  batch,
  linkTo,
}: {
  readonly batch: EvalBatch;
  readonly linkTo?: TrialLink;
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
          <BatchRunRow key={run.id} linkTo={linkTo} run={run} />
        ))}
      </DataTableBody>

      <DataTableFooter>
        {settledOf(batch)} of {counted(batch.runs.length, "run", "runs")}{" "}
        finished
      </DataTableFooter>
    </DataTable>
  );
}
