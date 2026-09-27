import type { EvalTrialAddress } from "@anpord/schema/domain/eval-read-models";
import { useQuery } from "@tanstack/react-query";
import { LiveTail } from "@/components/evals/live-tail";
import { TrialPlaceholder } from "@/components/evals/trial-placeholder";
import { TrialView } from "@/components/evals/trial-view";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";

export function TrialScreen({
  address,
}: {
  readonly address: EvalTrialAddress;
}) {
  const { data: run } = useQuery(evalQueries.run(address.runId));

  if (run === undefined) {
    return <TrialPlaceholder />;
  }

  const trial = run.trials.find(
    (candidate) => candidate.id === address.trialId
  );

  if (trial === undefined) {
    return (
      <ErrorCard
        description="This run has no trial with that id."
        title="Could not find this trial"
      />
    );
  }

  return (
    <>
      {run.status === "running" ? (
        <LiveTail batchId={address.batchId} runId={address.runId} />
      ) : null}
      <TrialView run={run} trial={trial} />
    </>
  );
}
