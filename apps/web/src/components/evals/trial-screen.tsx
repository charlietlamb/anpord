import { useQuery } from "@tanstack/react-query";
import { TrialSkeleton } from "@/components/evals/trial-skeleton";
import { TrialView } from "@/components/evals/trial-view";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useLiveRun } from "@/lib/evals/use-live-run";

export function TrialScreen({
  caseId,
  cellKey,
  ordinal,
  runId,
}: {
  readonly caseId: string;
  readonly cellKey: string;
  readonly ordinal: string;
  readonly runId: string;
}) {
  const { data: run } = useQuery(evalQueries.detail(runId));

  useLiveRun({ id: runId, running: run?.status === "running" });

  const cell = run?.cells.find((candidate) => candidate.cellKey === cellKey);
  const trial = cell?.trials.find(
    (candidate) => String(candidate.ordinal) === ordinal
  );

  if (run === undefined) {
    return <TrialSkeleton />;
  }

  if (cell === undefined || trial === undefined) {
    return (
      <ErrorCard
        description="This cell has no trial with that number."
        title="Could not find this trial"
      />
    );
  }

  return <TrialView caseId={caseId} cell={cell} run={run} trial={trial} />;
}
