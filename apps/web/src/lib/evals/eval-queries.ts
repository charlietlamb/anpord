import type { EvalRunSummary } from "@anpord/schema/domain/evals";
import { queryOptions } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import { getRun, listCellHistory, listRuns } from "@/lib/evals/evals-client";

/* Long enough that a run in flight is not a request every second, short
   enough that a finished trial appears while somebody is still looking. A
   trial takes tens of seconds, so a socket would buy nothing for the cost of
   a connection. */
const RUNNING_POLL_MS = 2000;

/** Polling derived from the data rather than driven by an effect, so nothing
 * keeps asking once every run has settled. */
const pollWhileRunning = (runs: readonly EvalRunSummary[] | undefined) =>
  runs?.some((run) => run.status === "running") ? RUNNING_POLL_MS : false;

export const evalQueries = {
  list: () =>
    queryOptions({
      queryKey: evalKeys.lists(),
      queryFn: () => listRuns(),
      refetchInterval: (query) => pollWhileRunning(query.state.data),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: evalKeys.detail(id),
      queryFn: () => getRun(id),
      refetchInterval: (query) =>
        query.state.data?.status === "running" ? RUNNING_POLL_MS : false,
    }),

  history: (cellKey: string) =>
    queryOptions({
      queryKey: evalKeys.history(cellKey),
      queryFn: () => listCellHistory(cellKey),
    }),
} as const;
