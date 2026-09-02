import type { EvalTrial } from "@anpord/schema/domain/evals";
import { TrialStatusMark } from "@/components/evals/eval-status-badge";
import { Metric } from "@/components/evals/metric";
import { ListRow } from "@/components/layout/list-row";
import { count, NOTHING, seconds } from "@/lib/evals/duration";

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
 * The ordinal is the row's identity. A run belongs to the reading around the
 * rows, not to one trial, so repeated readings name their run above the group.
 */
export function TrialRow({
  cellKey,
  runId,
  trial,
}: {
  readonly cellKey: string;
  readonly runId: string;
  readonly trial: EvalTrial;
}) {
  return (
    <ListRow
      leading={<TrialStatusMark status={trial.status} />}
      meta={
        <>
          <Metric className="w-20" name="exit">
            {exitOf(trial)}
          </Metric>

          <Metric className="w-24" name="commands">
            {trial.commands}
            {trial.failedCommands > 0 ? (
              <span className="text-warning">
                {trial.failedCommands} failed
              </span>
            ) : null}
          </Metric>

          <Metric className="w-16" name="model">
            {seconds(trial.modelMs)}
          </Metric>
          <Metric className="w-16" name="sandbox">
            {seconds(trial.sandboxMs)}
          </Metric>

          <Metric className="w-20" name="tokens">
            {trial.usage === null ? NOTHING : count(trial.usage.totalTokens)}
          </Metric>
        </>
      }
      params={{ cellKey, ordinal: String(trial.ordinal), runId }}
      to="/evals/$runId/cells/$cellKey/trials/$ordinal"
    >
      <span className="inline-flex size-5 items-center justify-center rounded-[5px] bg-muted/60 font-medium font-mono text-[10px] text-muted-foreground tabular-nums ring-1 ring-border">
        {trial.ordinal}
      </span>
    </ListRow>
  );
}
