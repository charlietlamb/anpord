import { StartedEval } from "@anpord/schema/domain/eval-playground";
import {
  EvalRunTail,
  type EvalTailMark,
} from "@anpord/schema/domain/eval-tail";
import {
  EvalArtifact,
  type EvalArtifactRequest,
  EvalCaseDetail,
  EvalCaseHistoryPage,
  EvalCasePage,
  type EvalPageCursor,
  EvalRun,
  EvalTrialAddress,
  RunSubscription,
} from "@anpord/schema/domain/evals";
import { Schema } from "effect";
import { createApiClient, searchOf } from "@/lib/api-client";

const api = createApiClient("/api");

const pagePath = (
  path: string,
  cursor: EvalPageCursor | null,
  extra: Record<string, string> = {}
) =>
  `${path}${searchOf({
    ...extra,
    cursorId: cursor?.id,
    cursorStartedAt: cursor?.startedAtMillis,
  })}`;

export const listCases = (tag: string | null, cursor: EvalPageCursor | null) =>
  api.request(
    EvalCasePage,
    pagePath("/evals/cases", cursor, tag === null ? {} : { tag })
  );

export const getRun = (id: string) =>
  api.request(EvalRun, `/evals/${encodeURIComponent(id)}`);

export const getRunSubscription = (id: string) =>
  api.request(RunSubscription, `/evals/${encodeURIComponent(id)}/subscription`);

export const readRunTail = (id: string, after: readonly EvalTailMark[]) =>
  api.post(EvalRunTail, `/evals/${encodeURIComponent(id)}/tail`, { after });

export const getTrialAddress = (id: string) =>
  api.request(EvalTrialAddress, `/evals/trials/${encodeURIComponent(id)}`);

export const listRunAddresses = (
  runId: string,
  within: { readonly cellKey?: string; readonly ordinal?: number } = {}
) =>
  api.post(
    Schema.Array(EvalTrialAddress),
    `/evals/${encodeURIComponent(runId)}/addresses`,
    within
  );

export const getCase = (id: string) =>
  api.request(EvalCaseDetail, `/evals/cases/${encodeURIComponent(id)}`);

export const listCaseHistory = (
  caseId: string,
  cellKey: string | null,
  page: number
) =>
  api.request(
    EvalCaseHistoryPage,
    `/evals/cases/${encodeURIComponent(caseId)}/history${searchOf({ cellKey, page })}`
  );

export const rerunCell = (runId: string, cellKey: string, trials: number) =>
  api.post(
    StartedEval,
    `/evals/${encodeURIComponent(runId)}/cells/${encodeURIComponent(cellKey)}/runs`,
    { trials }
  );

export const rerunCase = (caseId: string, trials: number) =>
  api.post(StartedEval, `/evals/cases/${encodeURIComponent(caseId)}/runs`, {
    trials,
  });

export const getArtifact = (input: EvalArtifactRequest) =>
  api.post(EvalArtifact, "/evals/artifacts", input);
