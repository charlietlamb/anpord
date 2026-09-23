import type { EvalCaseHistoryPage } from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { CaseTrialRow } from "@/components/evals/case-trial-row";
import { CursorPagination } from "@/components/layout/cursor-pagination";
import { EmptyNote } from "@/components/layout/empty-note";
import { CASE_HISTORY_TABLE } from "@/lib/evals/case-tables";
import { counted } from "@/lib/evals/conversation";

export function CaseReadings({
  caseId,
  history,
  onPage,
  paging = false,
}: {
  readonly caseId: string;
  readonly history: EvalCaseHistoryPage;
  readonly onPage: (page: number) => void;
  readonly paging?: boolean;
}) {
  const { entries, page, pageSize, total } = history;

  if (total === 0) {
    return <EmptyNote>No runs of this case yet.</EmptyNote>;
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = from + entries.length - 1;

  return (
    <DataTable
      columns={CASE_HISTORY_TABLE.columns}
      label={CASE_HISTORY_TABLE.label}
    >
      <DataTableHead headings={CASE_HISTORY_TABLE.headings} />

      <DataTableBody>
        {entries.flatMap((entry) =>
          entry.trials.map((trial) => (
            <CaseTrialRow
              caseId={caseId}
              entry={entry}
              key={`${entry.internalId}-${trial.ordinal}`}
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
