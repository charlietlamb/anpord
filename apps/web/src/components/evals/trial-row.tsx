import type { EvalTrial } from "@anpord/schema/domain/evals";
import { TrialBadge } from "@/components/evals/eval-status-badge";
import { Metric } from "@/components/evals/metric";
import { ListRow } from "@/components/layout/list-row";
import { count, NOTHING, seconds } from "@/lib/evals/duration";

/* -1 is the sentinel for an undecided trial, not a real exit code. */
const exitOf = (trial: EvalTrial) =>
  trial.exitCode === -1 ? "undecided" : String(trial.exitCode);

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
    <>
      <ListRow
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
        <TrialBadge ordinal={trial.ordinal} status={trial.status} />
      </ListRow>
      <TrialArtifacts
        artifacts={trial.artifacts}
        trial={{ id: runId, cellKey, ordinal: trial.ordinal }}
      />
    </>
  );
}
