import type { EvalTrial } from "@anpord/schema/domain/evals";
import { TrialRow } from "@/components/evals/trial-row";
import { EmptyNote } from "@/components/layout/empty-note";
import { RowList } from "@/components/layout/row-list";

export function TrialTable({
  cellKey,
  runId,
  trials,
}: {
  readonly cellKey: string;
  readonly runId: string;
  readonly trials: readonly EvalTrial[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 font-medium text-label text-muted-foreground">
        Trials
      </p>

      {trials.length === 0 ? (
        <EmptyNote>No trials recorded for this case in this run.</EmptyNote>
      ) : (
        <RowList label="Trials">
          {trials.map((trial) => (
            <TrialRow
              cellKey={cellKey}
              key={trial.ordinal}
              runId={runId}
              trial={trial}
            />
          ))}
        </RowList>
      )}
    </div>
  );
}
