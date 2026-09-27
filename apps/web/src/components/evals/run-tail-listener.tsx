import { useQuery } from "@tanstack/react-query";
import { evalQueries, TAIL_POLL_MS } from "@/lib/evals/eval-queries";
import { useLiveBatch } from "@/lib/evals/use-live-batch";

export function RunTailListener({
  batchId,
  runId,
}: {
  readonly batchId: string;
  readonly runId: string;
}) {
  const { listening } = useLiveBatch(batchId);

  useQuery({
    ...evalQueries.tail(batchId, runId),
    refetchInterval: listening ? false : TAIL_POLL_MS,
  });

  return null;
}
