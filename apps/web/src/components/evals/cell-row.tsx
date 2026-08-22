import type { EvalCell, EvalTask } from "@anpord/schema/domain/evals";
import { Link } from "@tanstack/react-router";
import { VerdictBadge } from "@/components/evals/eval-status-badge";
import {
  CommandSpread,
  OutcomeSummary,
} from "@/components/evals/outcome-summary";
import { ListRow } from "@/components/layout/list-row";

/**
 * One case against one task, as a row.
 *
 * A row rather than a card, because 604 of 612 runs hold exactly one cell and
 * a boxed panel around a single line reads as a container with nothing to
 * contain. The rail beside it carries what the run is; this carries what the
 * run found.
 */
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
          {/* Absent rather than negated: "not deterministic" is noise on the
              majority of cells that are not. */}
          {distribution.deterministic ? <span>det</span> : null}
          <CommandSpread
            max={distribution.commandMax}
            min={distribution.commandMin}
          />
        </>
      )}

      {cell.comparison === null ? null : (
        <VerdictBadge
          delta={cell.comparison.delta}
          verdict={cell.comparison.verdict}
        />
      )}
    </>
  );

  const body = (
    <>
      <span className="font-medium text-foreground text-label">
        {cell.caseName}
      </span>
      {task ? (
        <span className="ml-2.5 text-muted-foreground/70 text-xs">
          {task.model}
        </span>
      ) : null}
    </>
  );

  if (cell.cellKey === null) {
    return <ListRow meta={meta}>{body}</ListRow>;
  }

  return (
    <ListRow
      meta={meta}
      params={{ cellKey: cell.cellKey, runId }}
      to="/evals/$runId/cells/$cellKey"
    >
      {body}
    </ListRow>
  );
}

/** What a cell is measured against, when anything is. Kept off the row: a
 * verdict is a badge, and the reason it holds is a sentence. */
export function CellVerdictNote({ cell }: { readonly cell: EvalCell }) {
  const comparison = cell.comparison;

  if (comparison === null) {
    return null;
  }

  const notes = [
    comparison.verdict === "incomparable" ? comparison.reason : null,
    comparison.determinismLost ? "no longer deterministic" : null,
  ].filter((note): note is string => note !== null);

  if (notes.length === 0) {
    return null;
  }

  return (
    <p className="pl-2 text-muted-foreground text-xs">{notes.join(" · ")}</p>
  );
}

export function CellLink({
  cell,
  runId,
}: {
  readonly cell: EvalCell;
  readonly runId: string;
}) {
  if (cell.cellKey === null) {
    return null;
  }

  return (
    <Link
      className="text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
      params={{ cellKey: cell.cellKey, runId }}
      to="/evals/$runId/cells/$cellKey"
    >
      View trials
    </Link>
  );
}
