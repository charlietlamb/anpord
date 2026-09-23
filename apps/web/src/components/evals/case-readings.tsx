import type {
  EvalCaseVersion,
  EvalCellHistoryEntry,
} from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { CaseEditRow } from "@/components/evals/case-edit-row";
import { CaseTrialRow } from "@/components/evals/case-trial-row";
import { EmptyNote } from "@/components/layout/empty-note";
import { CASE_HISTORY_TABLE } from "@/lib/evals/case-tables";
import { timelineOf } from "@/lib/evals/case-timeline";
import { counted } from "@/lib/evals/conversation";

export function CaseReadings({
  caseId,
  entries,
  versions,
}: {
  readonly caseId: string;
  readonly entries: readonly EvalCellHistoryEntry[];
  readonly versions: readonly EvalCaseVersion[];
}) {
  if (entries.length === 0) {
    return <EmptyNote>No runs of this case yet.</EmptyNote>;
  }

  const trials = entries.reduce((sum, entry) => sum + entry.trials.length, 0);

  return (
    <DataTable
      columns={CASE_HISTORY_TABLE.columns}
      label={CASE_HISTORY_TABLE.label}
    >
      <DataTableHead headings={CASE_HISTORY_TABLE.headings} />

      <DataTableBody>
        {timelineOf(entries, versions).flatMap((item) =>
          item.kind === "reading"
            ? item.entry.trials.map((trial) => (
                <CaseTrialRow
                  caseId={caseId}
                  entry={item.entry}
                  key={`${item.entry.internalId}-${trial.ordinal}`}
                  trial={trial}
                />
              ))
            : [
                <CaseEditRow
                  created={item.created}
                  key={`edit-${item.version.definitionHash}`}
                  version={item.version}
                />,
              ]
        )}
      </DataTableBody>

      <DataTableFooter>
        Showing {counted(trials, "trial", "trials")}
      </DataTableFooter>
    </DataTable>
  );
}
