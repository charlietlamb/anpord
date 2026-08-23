import type { EvalCell, EvalTask } from "@anpord/schema/domain/evals";
import { CellVerdict } from "@/components/evals/cell-verdict";
import { RunStatusIcon } from "@/components/evals/eval-status-badge";
import {
  CommandSpread,
  OutcomeSummary,
} from "@/components/evals/outcome-summary";
import { VariantMarks } from "@/components/evals/variant-marks";
import { ListRow } from "@/components/layout/list-row";

export function CellRow({
  cell,
  runId,
  task,
}: {
  readonly cell: EvalCell;
  readonly runId: string;
  readonly task: EvalTask | undefined;
}) {
  const distribution = cell.distribution;

  const meta = (
    <>
      {distribution === null ? (
        <span className="text-muted-foreground">not recorded</span>
      ) : (
        <>
          <OutcomeSummary
            passed={distribution.passed}
            scored={distribution.scored}
            voided={distribution.voided}
          />

          {distribution.trials > 1 ? (
            <span className="text-muted-foreground/70">
              {distribution.trials} trials
            </span>
          ) : null}

          {distribution.deterministic ? <span>det</span> : null}
          <CommandSpread
            max={distribution.commandMax}
            min={distribution.commandMin}
          />
        </>
      )}

      {cell.comparison === null ? null : (
        <CellVerdict comparison={cell.comparison} />
      )}
    </>
  );

  const body = (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="truncate font-medium text-foreground text-label">
        {cell.caseName}
      </span>

      {task ? (
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground/70 text-xs">
          <VariantMarks columns={[task]} />
          <span className="truncate">{task.model}</span>
        </span>
      ) : null}
    </span>
  );

  if (cell.cellKey === null) {
    return (
      <ListRow leading={<RunStatusIcon status={cell.status} />} meta={meta}>
        {body}
      </ListRow>
    );
  }

  return (
    <ListRow
      leading={<RunStatusIcon status={cell.status} />}
      meta={meta}
      params={{ cellKey: cell.cellKey, runId }}
      to="/evals/$runId/cells/$cellKey"
    >
      {body}
    </ListRow>
  );
}
