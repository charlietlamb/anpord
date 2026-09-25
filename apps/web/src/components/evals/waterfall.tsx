import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { EmptyNote } from "@anpord/ui/components/ui/empty-note";
import { Surface } from "@anpord/ui/components/ui/surface";
import { useMemo } from "react";
import { UntimedSteps } from "@/components/evals/untimed-steps";
import { WaterfallAxis } from "@/components/evals/waterfall-axis";
import { TimedRow } from "@/components/evals/waterfall-row";
import { journalKey } from "@/lib/evals/journal-presentation";
import { selectedStepOf } from "@/lib/evals/selected-step";
import { useSelectedStep } from "@/lib/evals/use-selected-step";
import {
  type WaterfallRow,
  waterfallLayout,
} from "@/lib/evals/waterfall-layout";
import { TIMELINE_COLUMNS } from "@/lib/evals/waterfall-scale";

export function Waterfall({
  running,
  timed,
  trajectory,
}: {
  readonly running: boolean;
  readonly timed: boolean;
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  const { rows, spanMs } = waterfallLayout(trajectory);
  const [step, setStep] = useSelectedStep();
  const open = selectedStepOf(trajectory, rows, step);
  const positions = useMemo(
    () => new Map(trajectory.map((entry, index) => [entry, index])),
    [trajectory]
  );
  const at = (row: WaterfallRow) => positions.get(row.entry) ?? -1;
  const selectedAt = (row: WaterfallRow) => open?.entry === row.entry;

  if (trajectory.length === 0) {
    return (
      <Surface>
        <EmptyNote>
          {running
            ? "Waiting for the first step. The agent reads before it acts."
            : "This trial recorded no journal."}
        </EmptyNote>
      </Surface>
    );
  }

  if (!timed || rows.length === 0) {
    return <UntimedSteps trajectory={trajectory} />;
  }

  return (
    <DataTable columns={TIMELINE_COLUMNS} label="Timeline">
      <DataTableHead
        headings={["Step", <WaterfallAxis key="axis" spanMs={spanMs} />]}
      />

      <DataTableBody>
        {rows.map((row, index) => (
          <TimedRow
            key={journalKey(row.entry, index)}
            onSelect={() => setStep(selectedAt(row) ? null : at(row))}
            row={row}
            selected={selectedAt(row)}
            spanMs={spanMs}
          />
        ))}
      </DataTableBody>
    </DataTable>
  );
}
