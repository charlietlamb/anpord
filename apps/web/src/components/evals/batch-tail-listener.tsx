import { useQuery } from "@tanstack/react-query";
import { evalQueries, TAIL_POLL_MS } from "@/lib/evals/eval-queries";
import { useLiveBatch } from "@/lib/evals/use-live-batch";

export function BatchTailListener({ batchId }: { readonly batchId: string }) {
  const { listening } = useLiveBatch(batchId);

  useQuery({
    ...evalQueries.batchTail(batchId),
    refetchInterval: listening ? false : TAIL_POLL_MS,
  });

  return null;
}
