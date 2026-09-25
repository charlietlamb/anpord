import { AgeCell } from "@anpord/ui/components/evals/age-cell";
import { BatchRuns } from "@anpord/ui/components/evals/batch-runs";
import { EvalStatusBadge } from "@anpord/ui/components/evals/eval-status-badge";
import { LivePip } from "@anpord/ui/components/evals/live-pip";
import { distributionStatus } from "@anpord/ui/lib/evals/eval-status";
import { Link } from "@tanstack/react-router";
import { ErrorCard } from "@/components/layout/error-card";
import { PageShell } from "@/components/layout/page-shell";
import { triggerPresentation } from "@/lib/evals/run-trigger";
import { useLiveBatchRuns } from "@/lib/evals/use-live-batch-runs";

const scoredOf = (
  runs: readonly {
    readonly distribution: { readonly passed: number; readonly scored: number };
  }[]
) =>
  runs.reduce(
    (total, run) => ({
      passed: total.passed + run.distribution.passed,
      scored: total.scored + run.distribution.scored,
    }),
    { passed: 0, scored: 0 }
  );

const trialLink = (target: { caseId: string; trialId: string }) => (
  <Link
    params={{ caseId: target.caseId, trialId: target.trialId }}
    to="/evals/cases/$caseId/trials/$trialId"
  />
);

export function BatchScreen({ batchId }: { readonly batchId: string }) {
  const { batch, error, running } = useLiveBatchRuns(batchId);
  const source = triggerPresentation(batch?.trigger ?? null);

  if (error) {
    return (
      <ErrorCard
        description={error.message}
        title="Could not load this batch"
      />
    );
  }

  return (
    <PageShell
      description={
        batch === undefined ? undefined : (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-sm">
            {running ? <LivePip label="Running" /> : null}

            <EvalStatusBadge
              size="xs"
              status={distributionStatus(scoredOf(batch.runs))}
            />

            <span className="flex items-center gap-1.5">
              <source.Icon className="size-3.5 shrink-0" />
              {batch.local ? "Local" : source.label}
            </span>

            <span className="flex items-center gap-1">
              Started <AgeCell at={batch.startedAt.epochMillis} />
            </span>
          </span>
        )
      }
      title="Batch"
      width="wide"
    >
      {batch === undefined ? null : (
        <BatchRuns batch={batch} linkTo={trialLink} />
      )}
    </PageShell>
  );
}
