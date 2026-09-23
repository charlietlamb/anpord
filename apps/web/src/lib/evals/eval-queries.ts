import { EVAL_TAIL_PAGE } from "@anpord/schema/domain/eval-tail";
import type {
  EvalHarness,
  EvalPageCursor,
  EvalRun,
  EvalRunPage,
} from "@anpord/schema/domain/evals";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import {
  getCase,
  getModelCatalogue,
  getPlayground,
  getRun,
  getTrialAddress,
  listCaseHistory,
  listCases,
  listRuns,
  readRunTail,
} from "@/lib/evals/evals-client";
import {
  type HeardTail,
  heardTail,
  NOTHING_HEARD,
  overlayTail,
} from "@/lib/evals/run-tail";

const DETAIL_POLL_MS = 15_000;
const LIST_POLL_MS = 5000;

const TAIL_POLL_MS = 3000;

/* The poll below owns freshness while a run moves; staleTime 0 here made every
   hop between a run, its cells and its trials refetch the same data. */
const LIVE = {
  refetchIntervalInBackground: false,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  staleTime: DETAIL_POLL_MS,
} as const;

/* Polls only while a run is still moving, so a finished page stops polling itself. */
const pollWhileRunning = (page: EvalRunPage | undefined) =>
  page?.runs.some((run) => run.status === "running") ? LIST_POLL_MS : false;

const catchUp = async (id: string, held: HeardTail): Promise<HeardTail> => {
  const read = await readRunTail(id, held.next);
  const heard = heardTail(held, read);

  return read.events.length < EVAL_TAIL_PAGE ? heard : catchUp(id, heard);
};

export const evalQueries = {
  list: (cursor: EvalPageCursor | null) =>
    queryOptions({
      queryKey: evalKeys.list(cursor),
      queryFn: () => listRuns(cursor),
      refetchInterval: (query) => pollWhileRunning(query.state.data),
      ...LIVE,
    }),

  cases: (tag: string | null, cursor: EvalPageCursor | null = null) =>
    queryOptions({
      queryKey: evalKeys.cases(tag, cursor),
      queryFn: () => listCases(tag, cursor),
      placeholderData: keepPreviousData,
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

  tail: (id: string) =>
    queryOptions({
      queryKey: evalKeys.tail(id),
      queryFn: async ({ client }) => {
        const held =
          client.getQueryData<HeardTail>(evalKeys.tail(id)) ?? NOTHING_HEARD;
        const heard = await catchUp(id, held);

        client.setQueryData<EvalRun>(evalKeys.detail(id), (run) =>
          run === undefined ? run : overlayTail(run, heard.journals)
        );

        const settledMoved =
          held.settled !== null && held.settled !== heard.settled;

        if (settledMoved || !heard.running) {
          await client.invalidateQueries({ queryKey: evalKeys.detail(id) });
        }

        return heard;
      },
      refetchInterval: TAIL_POLL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    }),

  case: (id: string) =>
    queryOptions({
      queryKey: evalKeys.case(id),
      queryFn: () => getCase(id),
    }),

  trialAddress: (id: string) =>
    queryOptions({
      queryKey: evalKeys.trialAddress(id),
      queryFn: () => getTrialAddress(id),
      staleTime: Number.POSITIVE_INFINITY,
    }),

  caseHistory: (caseId: string, cellKey: string | null, page: number) =>
    queryOptions({
      queryKey: evalKeys.caseHistory(caseId, cellKey, page),
      queryFn: () => listCaseHistory(caseId, cellKey, page),
      placeholderData: keepPreviousData,
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
