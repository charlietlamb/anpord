import type {
  EvalHarness,
  EvalPageCursor,
  EvalRunPage,
} from "@anpord/schema/domain/evals";
import { queryOptions } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import {
  getModelCatalogue,
  getPlayground,
  getRun,
  listCellHistory,
  listRuns,
} from "@/lib/evals/evals-client";

const DETAIL_POLL_MS = 2000;
const LIST_POLL_MS = 5000;

const LIVE = {
  refetchIntervalInBackground: false,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  staleTime: 0,
} as const;

/* Polls only while something on the page is still moving. A run that finishes
   on the page a reader is looking at stops the polling it started. */
const pollWhileRunning = (page: EvalRunPage | undefined) =>
  page?.runs.some((run) => run.status === "running") ? LIST_POLL_MS : false;

export const evalQueries = {
  list: (cursor: EvalPageCursor | null) =>
    queryOptions({
      queryKey: evalKeys.list(cursor),
      queryFn: () => listRuns(cursor),
      refetchInterval: (query) => pollWhileRunning(query.state.data),
      ...LIVE,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: evalKeys.detail(id),
      queryFn: () => getRun(id),
      refetchInterval: (query) =>
        query.state.data?.status === "running" ? DETAIL_POLL_MS : false,
      ...LIVE,
    }),

  history: (cellKey: string) =>
    queryOptions({
      queryKey: evalKeys.history(cellKey),
      queryFn: () => listCellHistory(cellKey),
    }),

  playground: (id: string) =>
    queryOptions({
      queryKey: evalKeys.playground(id),
      queryFn: () => getPlayground(id),
    }),

  models: (harness: EvalHarness, query = "") =>
    queryOptions({
      queryKey: evalKeys.models(harness, query),
      queryFn: () => getModelCatalogue(harness, query),
      staleTime: 5 * 60 * 1000,
    }),
} as const;
