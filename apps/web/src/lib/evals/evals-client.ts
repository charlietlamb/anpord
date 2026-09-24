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
import { fromWire } from "@/lib/wire";

const BASE = "/api";

async function send(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }

  return response;
}

async function request<A, I>(
  schema: Schema.Schema<A, I>,
  path: string,
  init?: RequestInit
): Promise<A> {
  const response = await send(path, init);

  return fromWire(schema, await response.json());
}

const pagePath = (
  path: string,
  cursor: EvalPageCursor | null,
  extra: Record<string, string> = {}
) => {
  const params = new URLSearchParams(extra);

  if (cursor !== null) {
    params.set("cursorId", cursor.id);
    params.set("cursorStartedAt", String(cursor.startedAtMillis));
  }

  const query = params.toString();

  return query === "" ? path : `${path}?${query}`;
};

export const listCases = (tag: string | null, cursor: EvalPageCursor | null) =>
  request(
    EvalCasePage,
    pagePath("/evals/cases", cursor, tag === null ? {} : { tag })
  );

export const getRun = (id: string) =>
  request(EvalRun, `/evals/${encodeURIComponent(id)}`);

export const getRunSubscription = (id: string) =>
  request(RunSubscription, `/evals/${encodeURIComponent(id)}/subscription`);

export const readRunTail = (id: string, after: readonly EvalTailMark[]) =>
  post(EvalRunTail, `/evals/${encodeURIComponent(id)}/tail`, { after });

export const getTrialAddress = (id: string) =>
  request(EvalTrialAddress, `/evals/trials/${encodeURIComponent(id)}`);

export const listRunAddresses = (
  runId: string,
  within: { readonly cellKey?: string; readonly ordinal?: number } = {}
) =>
  post(
    Schema.Array(EvalTrialAddress),
    `/evals/${encodeURIComponent(runId)}/addresses`,
    within
  );

export const getCase = (id: string) =>
  request(EvalCaseDetail, `/evals/cases/${encodeURIComponent(id)}`);

export const listCaseHistory = (
  caseId: string,
  cellKey: string | null,
  page: number
) => {
  const params = new URLSearchParams({ page: String(page) });

  if (cellKey !== null) {
    params.set("cellKey", cellKey);
  }

  return request(
    EvalCaseHistoryPage,
    `/evals/cases/${encodeURIComponent(caseId)}/history?${params}`
  );
};

function post<A, I>(
  schema: Schema.Schema<A, I>,
  path: string,
  body: unknown
): Promise<A> {
  return request(schema, path, {
    body: JSON.stringify(body),
    method: "POST",
  });
}

export const rerunCell = (runId: string, cellKey: string, trials: number) =>
  post(
    StartedEval,
    `/evals/${encodeURIComponent(runId)}/cells/${encodeURIComponent(cellKey)}/runs`,
    { trials }
  );

export const rerunCase = (caseId: string, trials: number) =>
  post(StartedEval, `/evals/cases/${encodeURIComponent(caseId)}/runs`, {
    trials,
  });

export const getArtifact = (input: EvalArtifactRequest) =>
  post(EvalArtifact, "/evals/artifacts", input);
