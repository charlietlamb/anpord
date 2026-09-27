import { useQuery } from "@tanstack/react-query";
import { evalQueries } from "@/lib/evals/eval-queries";

export function useLiveBatchRuns(batchId: string) {
  const { data: batch, error } = useQuery(evalQueries.batch(batchId));

  return { batch, error, running: batch?.status === "running" };
}
