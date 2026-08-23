import type { EvalTrial } from "@anpord/schema/domain/evals";
import { TrialStatusMark } from "@/components/evals/eval-status-badge";
import { ListRow } from "@/components/layout/list-row";
import { count, NOTHING, seconds } from "@/lib/evals/duration";
import { shortId } from "@/lib/evals/short-id";

/** -1 is the sentinel a trial nothing decided carries. Shown as a word,
 * because a reader seeing "-1" would take it for an exit code. */
const exitOf = (trial: EvalTrial) =>
  trial.exitCode === -1 ? "undecided" : String(trial.exitCode);

/**
 * One trial, as a row.
 *
 * The same shape as a run and a cell, because a reader moving between the
 * three screens is reading the same kind of thing at three depths: a mark on
 * the left, what it is, then its numbers holding their columns.
 *
 * The run names itself on the first trial of a reading only. Repeating it down
 * every row of a three-trial reading turns a column of distinct values into a
 * column of one value.
 */
export function TrialRow({
  cellKey,
  runId,
  showRun,
  trial,
}: {
  readonly cellKey: string;
  readonly runId: string;
  readonly showRun: boolean;
  readonly trial: EvalTrial;
}) {
  return (
    <ListRow
      leading={<TrialStatusMark status={trial.status} />}
      meta={
        <>
          <span className="w-16 text-right">{exitOf(trial)}</span>

          <span className="w-20 text-right">
            <span className="inline-flex items-center gap-1.5">
              {trial.commands}
              {trial.failedCommands > 0 ? (
                <span className="text-warning">
                  {trial.failedCommands} failed
                </span>
              ) : null}
            </span>
          </span>

          <span className="w-12 text-right">{seconds(trial.modelMs)}</span>
          <span className="w-12 text-right">{seconds(trial.sandboxMs)}</span>

          <span className="w-16 text-right">
            {trial.usage === null ? NOTHING : count(trial.usage.totalTokens)}
          </span>
        </>
      }
      params={{ cellKey, ordinal: String(trial.ordinal), runId }}
      to="/evals/$runId/cells/$cellKey/trials/$ordinal"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="w-14 shrink-0 text-muted-foreground text-xs tabular-nums">
          {showRun ? shortId(runId) : ""}
        </span>

        <span className="font-medium text-foreground text-label tabular-nums">
          {trial.ordinal}
        </span>
      </span>
    </ListRow>
  );
}
