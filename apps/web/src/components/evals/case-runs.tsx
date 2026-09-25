import type { EvalRunPage } from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { EmptyNote } from "@anpord/ui/components/ui/empty-note";
import { RunTrialRow } from "@/components/evals/run-trial-row";
import { CursorPagination } from "@/components/layout/cursor-pagination";
import { CASE_RUNS_TABLE } from "@/lib/evals/case-tables";
import { counted } from "@/lib/evals/conversation";

export function CaseRuns({
  caseId,
  page: runPage,
  onPage,
  paging = false,
}: {
  readonly caseId: string;
  readonly page: EvalRunPage;
  readonly onPage: (page: number) => void;
  readonly paging?: boolean;
}) {
  const { page, pageSize, runs, total } = runPage;

  if (total === 0) {
    return <EmptyNote>No runs of this case yet.</EmptyNote>;
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = from + runs.length - 1;

  return (
    <DataTable columns={CASE_RUNS_TABLE.columns} label={CASE_RUNS_TABLE.label}>
      <DataTableHead headings={CASE_RUNS_TABLE.headings} />

      <DataTableBody>
        {runs.flatMap((run) =>
          run.trials.map((trial) => (
            <RunTrialRow
              caseId={caseId}
              key={trial.id}
              run={run}
              trial={trial}
            />
          ))
        )}
      </DataTableBody>

      <DataTableFooter
        actions={
          <CursorPagination
            canGoNext={page < pages}
            canGoPrev={page > 1}
            disabled={paging}
            onNext={() => onPage(page + 1)}
            onPrev={() => onPage(page - 1)}
            page={page}
            pages={pages}
          />
        }
      >
        Showing {from}–{to} of {counted(total, "run", "runs")}
      </DataTableFooter>
    </DataTable>
  );
}
