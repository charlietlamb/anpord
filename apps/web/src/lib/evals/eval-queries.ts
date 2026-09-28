import type { EvalHomeRange } from "@anpord/schema/domain/eval-home";
import type { EvalPageCursor } from "@anpord/schema/domain/eval-read-models";
import type { RerunIntent } from "@anpord/schema/domain/eval-rerun";
import { EVAL_TAIL_PAGE } from "@anpord/schema/domain/eval-tail";
import type {
  EvalArtifactRequest,
  EvalHarness,
} from "@anpord/schema/domain/eval-trial";
import type { EvalBatch, EvalRun } from "@anpord/schema/domain/evals";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import {
  type CaseFilters,
  getArtifact,
  getBatch,
  getCase,
  getRun,
  getSuite,
  getTrialAddress,
  listCaseRuns,
  listCases,
  listModels,
  listSuites,
  planSuiteRerun,
  readBatchTail,
  readHome,
} from "@/lib/evals/evals-client";
import {
  type HeardTail,
  heardTail,
  NOTHING_HEARD,
  overlayBatchTail,
  overlayTail,
} from "@/lib/evals/run-tail";

const RUN_POLL_MS = 15_000;
export const TAIL_POLL_MS = 3000;
const CATALOGUE_STALE_MS = 300_000;

const LIVE = {
  refetchIntervalInBackground: false,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  staleTime: RUN_POLL_MS,
} as const;

const LIST = {
  placeholderData: keepPreviousData,
  refetchInterval: RUN_POLL_MS,
  refetchIntervalInBackground: false,
  staleTime: RUN_POLL_MS,
} as const;

const catchUp = async (
  batchId: string,
  held: HeardTail
): Promise<HeardTail> => {
  const read = await readBatchTail(batchId, held.next);
  const heard = heardTail(held, read);
  return read.events.length < EVAL_TAIL_PAGE ? heard : catchUp(batchId, heard);
};

export const evalQueries = {
  home: (range: EvalHomeRange) =>
    queryOptions({
      queryKey: evalKeys.home(range),
      queryFn: () => readHome(range),
      ...LIST,
    }),

  cases: (filters: CaseFilters, cursor: EvalPageCursor | null = null) =>
    queryOptions({
      queryKey: evalKeys.cases(filters, cursor),
      queryFn: () => listCases(filters, cursor),
      ...LIST,
    }),

  suites: (cursor: EvalPageCursor | null = null) =>
    queryOptions({
      queryKey: evalKeys.suites(cursor),
      queryFn: () => listSuites(cursor),
      ...LIST,
    }),

  suite: (id: string) =>
    queryOptions({
      queryKey: evalKeys.suite(id),
      queryFn: () => getSuite(id),
    }),

  case: (id: string) =>
    queryOptions({
      queryKey: evalKeys.case(id),
      queryFn: () => getCase(id),
    }),

  rerunPlan: (suiteId: string, intent: RerunIntent) =>
    queryOptions({
      queryKey: evalKeys.rerunPlan(suiteId, intent),
      queryFn: () => planSuiteRerun(suiteId, intent),
      staleTime: RUN_POLL_MS,
    }),

  models: (harness: EvalHarness, q: string | null) =>
    queryOptions({
      queryKey: evalKeys.models(harness, q),
      queryFn: () => listModels(harness, q),
      placeholderData: keepPreviousData,
      staleTime: CATALOGUE_STALE_MS,
    }),

  caseRuns: (caseId: string, variant: string | null, page: number) =>
    queryOptions({
      queryKey: evalKeys.caseRuns(caseId, variant, page),
      queryFn: () => listCaseRuns(caseId, variant, page),
      placeholderData: keepPreviousData,
    }),

  run: (id: string) =>
    queryOptions({
      queryKey: evalKeys.run(id),
      queryFn: () => getRun(id),
      refetchInterval: (query) =>
        query.state.data?.status === "running" ? RUN_POLL_MS : false,
      ...LIVE,
    }),

  tail: (batchId: string, runId: string) =>
    queryOptions({
      queryKey: evalKeys.tail(batchId, runId),
      queryFn: async ({ client }) => {
        const held =
          client.getQueryData<HeardTail>(evalKeys.tail(batchId, runId)) ??
          NOTHING_HEARD;
        const heard = await catchUp(batchId, held);

        client.setQueryData<EvalRun>(evalKeys.run(runId), (run) =>
          run === undefined ? run : overlayTail(run, heard.journals)
        );

        if (
          (held.settled !== null && held.settled !== heard.settled) ||
          !heard.running
        ) {
          await client.invalidateQueries({ queryKey: evalKeys.run(runId) });
        }

        return heard;
      },
      refetchInterval: TAIL_POLL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    }),

  batch: (id: string) =>
    queryOptions({
      queryKey: evalKeys.batch(id),
      queryFn: () => getBatch(id),
      refetchInterval: (query) =>
        query.state.data?.status === "running" ? RUN_POLL_MS : false,
      ...LIVE,
    }),

  batchTail: (batchId: string) =>
    queryOptions({
      queryKey: evalKeys.tails(batchId),
      queryFn: async ({ client }) => {
        const held =
          client.getQueryData<HeardTail>(evalKeys.tails(batchId)) ??
          NOTHING_HEARD;
        const heard = await catchUp(batchId, held);

        client.setQueryData<EvalBatch>(evalKeys.batch(batchId), (batch) =>
          batch === undefined ? batch : overlayBatchTail(batch, heard.journals)
        );

        if (
          (held.settled !== null && held.settled !== heard.settled) ||
          !heard.running
        ) {
          await client.invalidateQueries({ queryKey: evalKeys.batch(batchId) });
        }

        return heard;
      },
      refetchInterval: TAIL_POLL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    }),

  trialAddress: (id: string) =>
    queryOptions({
      queryKey: evalKeys.trialAddress(id),
      queryFn: () => getTrialAddress(id),
      staleTime: Number.POSITIVE_INFINITY,
    }),

  artifact: (request: EvalArtifactRequest) =>
    queryOptions({
      queryKey: evalKeys.artifact(request),
      queryFn: () => getArtifact(request),
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 300_000,
    }),
} as const;
