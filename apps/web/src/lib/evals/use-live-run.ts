import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";
import { useEffect, useRef } from "react";
import { evalKeys } from "@/lib/evals/eval-keys";
import { getRunSubscription } from "@/lib/evals/evals-client";

export function useLiveRun({
  id,
  running,
}: {
  readonly id: string;
  readonly running: boolean;
}) {
  const client = useQueryClient();

  const { data: subscription } = useQuery({
    enabled: running,
    gcTime: 0,
    queryKey: evalKeys.subscription(id),
    queryFn: () => getRunSubscription(id),
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
      .map((run) => `${run.id}:${run.status}:${run.updatedAt.getTime()}`)
      .join("|");

    if (signature === "" || signature === seen.current) {
      return;
    }

    seen.current = signature;
    client.invalidateQueries({ queryKey: evalKeys.detail(id) });
  }, [client, id, runs]);
}
