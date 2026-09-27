import { useQuery } from "@tanstack/react-query";
import { LiveTail } from "@/components/evals/live-tail";
import { RunView } from "@/components/evals/run-view";
import { TrialPlaceholder } from "@/components/evals/trial-placeholder";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";

export function RunScreen({
  caseId,
  runId,
}: {
  readonly caseId: string;
  readonly runId: string;
}) {
  const { data: run, error } = useQuery(evalQueries.run(runId));

  if (error) {
    return (
      <ErrorCard description={error.message} title="Could not load this run" />
    );
  }

  if (run === undefined) {
    return <TrialPlaceholder />;
  }

  return (
    <>
      {run.status === "running" ? (
        <LiveTail batchId={run.batchId} runId={run.id} />
      ) : null}

      <RunView caseId={caseId} run={run} />
    </>
  );
}
