import { useQuery } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import { evalQueries, TAIL_POLL_MS } from "@/lib/evals/eval-queries";
import { useLiveBatch } from "@/lib/evals/use-live-batch";

export function useLiveRun({
  batchId,
  runId,
  running,
}: {
  readonly batchId: string;
  readonly runId: string;
  readonly running: boolean;
}) {
  const { listening } = useLiveBatch({
    batchId,
    running,
    tail: evalKeys.tails(batchId),
  });

  useQuery({
    ...evalQueries.tail(batchId, runId),
    enabled: running,
    refetchInterval: listening ? false : TAIL_POLL_MS,
  });

  return { listening };
}
