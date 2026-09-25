import { useQuery } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import { evalQueries, TAIL_POLL_MS } from "@/lib/evals/eval-queries";
import { useLiveBatch } from "@/lib/evals/use-live-batch";

export function useLiveBatchRuns(batchId: string) {
  const { data: batch, error } = useQuery(evalQueries.batch(batchId));
  const running = batch?.status === "running";

  const { listening } = useLiveBatch({
    batchId,
    running,
    tail: evalKeys.tails(batchId),
  });

  useQuery({
    ...evalQueries.batchTail(batchId),
    enabled: running,
    refetchInterval: listening ? false : TAIL_POLL_MS,
  });

  return { batch, error, listening, running };
}
