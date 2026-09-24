import type { EvalTrialAddress } from "@anpord/schema/domain/evals";
import { useQuery } from "@tanstack/react-query";
import { TrialPlaceholder } from "@/components/evals/trial-placeholder";
import { TrialView } from "@/components/evals/trial-view";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useLiveRun } from "@/lib/evals/use-live-run";

export function TrialScreen({
  address,
}: {
  readonly address: EvalTrialAddress;
}) {
  const { data: run } = useQuery(evalQueries.run(address.runId));

  useLiveRun({
    batchId: address.batchId,
    runId: address.runId,
    running: run?.status === "running",
  });

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

  return <TrialView run={run} trial={trial} />;
}
