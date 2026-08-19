import type { EvalRun } from "@anpord/schema/domain/evals";
import { EmptyState } from "@anpord/ui/components/empty-state";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { FlaskIcon } from "@phosphor-icons/react";
import { RunDistribution } from "@/components/evals/run-distribution";
import { TrialRow } from "@/components/evals/trial-row";

/* Keyed by the trial each placeholder stands for, so a row keeps its identity
   when the real result replaces it. */
const Waiting = ({ ordinals }: { readonly ordinals: readonly number[] }) => (
  <div className="overflow-hidden rounded-lg border">
    {ordinals.map((ordinal) => (
      <div
        className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
        key={ordinal}
      >
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="ml-auto h-4 w-40" />
      </div>
    ))}
  </div>
);

/**
 * The right half of the playground: nothing, then a run in flight, then the
 * finding.
 *
 * A run takes tens of seconds, so the trials appear as rows the moment they
 * are queued rather than after the whole set lands. Watching them settle one
 * at a time is most of what makes a slow thing tolerable.
 */
export function RunPanel({ run }: { readonly run: EvalRun | undefined }) {
  if (run === undefined) {
    return (
      <EmptyState
        description="Run the task to see how many commands each agent took, what it changed, and the exit code of everything it ran."
        icon={<FlaskIcon />}
        texture
        title="No runs yet"
      />
    );
  }

  const settled = run.trials.filter((trial) => trial.status !== "running");
  const running = run.status === "running";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-muted-foreground text-sm">
        <span className="font-medium text-foreground">{run.taskName}</span>
        <span>·</span>
        <span>{run.harness}</span>
        <span>·</span>
        <span>{run.model}</span>
        <span>·</span>
        <span>{run.provider}</span>
        {running ? (
          <span className="ml-auto tabular-nums">
            {settled.length} of {run.trials.length} done
          </span>
        ) : null}
      </div>

      {run.distribution === null ? null : (
        <RunDistribution distribution={run.distribution} />
      )}

      {run.failure === null ? null : (
        <p className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive text-sm">
          {run.failure}
        </p>
      )}

      {settled.length === 0 ? (
        <Waiting ordinals={run.trials.map((trial) => trial.ordinal)} />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          {run.trials.map((trial, index) => (
            <TrialRow index={index} key={trial.ordinal} trial={trial} />
          ))}
        </div>
      )}
    </div>
  );
}
