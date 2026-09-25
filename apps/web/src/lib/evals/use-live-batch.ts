import type { QueryKey } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";
import { useEffect, useRef } from "react";
import { evalKeys } from "@/lib/evals/eval-keys";
import { getBatchSubscription } from "@/lib/evals/evals-client";

/* Refreshed a minute before the server's hour expires, so a dashboard left open
   keeps a token the realtime socket still accepts. */
const RENEW_BEFORE_MS = 60_000;

export interface LiveBatch {
  readonly listening: boolean;
}

export function useLiveBatch({
  batchId,
  running,
  tail,
}: {
  readonly batchId: string;
  readonly running: boolean;
  readonly tail: QueryKey;
}): LiveBatch {
  const client = useQueryClient();

  const { data: subscription } = useQuery({
    enabled: running,
    gcTime: 0,
    queryKey: evalKeys.subscription(batchId),
    queryFn: () => getBatchSubscription(batchId),
    refetchInterval: (query) => {
      const expires = query.state.data?.expiresAtMillis;

      return expires === undefined
        ? false
        : Math.max(expires - Date.now() - RENEW_BEFORE_MS, RENEW_BEFORE_MS);
    },
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const { runs } = useRealtimeRunsWithTag(subscription?.tag ?? "", {
    accessToken: subscription?.token,
    enabled: running && subscription !== undefined,
  });

  const seen = useRef("");

  useEffect(() => {
    const signature = runs
      .map(
        (run) =>
          `${run.id}:${run.status}:${run.updatedAt.getTime()}:${String(run.metadata?.tick ?? 0)}`
      )
      .join("|");

    if (signature === "" || signature === seen.current) {
      return;
    }

    seen.current = signature;
    client.invalidateQueries({ queryKey: tail });
  }, [client, runs, tail]);

  return { listening: runs.length > 0 };
}
