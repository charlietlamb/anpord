import {
  EvalBatchTail,
  type EvalTailMark,
} from "@anpord/schema/domain/eval-tail";
import {
  BatchSubscription,
  EvalArtifact,
  type EvalArtifactRequest,
  EvalBatch,
  EvalCaseDetail,
  EvalCasePage,
  type EvalPageCursor,
  EvalRun,
  EvalRunPage,
  EvalTrialAddress,
  StartedBatch,
} from "@anpord/schema/domain/evals";
import type { RunCaseRequest } from "@anpord/schema/domain/run-case";
import { createApiClient, searchOf } from "@/lib/api-client";

const api = createApiClient("/api/evals");

const path = (...parts: readonly string[]) =>
  parts.map((part) => `/${encodeURIComponent(part)}`).join("");

export interface CaseFilters {
  readonly suite: string | null;
  readonly tag: string | null;
}

export const listCases = (
  filters: CaseFilters,
  cursor: EvalPageCursor | null
) =>
  api.request(
    EvalCasePage,
    `/cases${searchOf({
      cursorId: cursor?.id,
      cursorStartedAt: cursor?.startedAtMillis,
      suite: filters.suite,
      tag: filters.tag,
    })}`
  );

export const getCase = (id: string) =>
  api.request(EvalCaseDetail, path("cases", id));

export const listCaseRuns = (
  caseId: string,
  variant: string | null,
  page: number
) =>
  api.request(
    EvalRunPage,
    `${path("cases", caseId, "runs")}${searchOf({ page, variant })}`
  );

export const runCase = (caseId: string, request: RunCaseRequest) =>
  api.post(StartedBatch, path("cases", caseId, "runs"), request);

export const getRun = (id: string) => api.request(EvalRun, path("runs", id));

export const getBatch = (id: string) =>
  api.request(EvalBatch, path("batches", id));

export const getBatchSubscription = (id: string) =>
  api.request(BatchSubscription, path("batches", id, "subscription"));

export const readBatchTail = (id: string, after: readonly EvalTailMark[]) =>
  api.post(EvalBatchTail, path("batches", id, "tail"), { after });

export const getTrialAddress = (id: string) =>
  api.request(EvalTrialAddress, path("trials", id));

export const getArtifact = (input: EvalArtifactRequest) =>
  api.post(EvalArtifact, "/artifacts", input);
