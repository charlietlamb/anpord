import type {
  EvalHarness,
  EvalPageCursor,
  PlaygroundConfigView,
} from "@anpord/schema/domain/evals";
import {
  EvalCellHistoryEntry,
  EvalRun,
  EvalRunPage,
  ModelCatalogue,
  PlaygroundView,
  StartedEval,
} from "@anpord/schema/domain/evals";
import { Effect, Schema } from "effect";

const BASE = "/api";

const EvalCellHistory = Schema.Array(EvalCellHistoryEntry);

type PlaygroundConfig = typeof PlaygroundConfigView.Type;

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
  const payload = await response.json();

  return Effect.runPromise(Schema.decodeUnknown(schema)(payload));
}

export const listRuns = (cursor: EvalPageCursor | null) => {
  const params = new URLSearchParams();

  if (cursor !== null) {
    params.set("cursorId", cursor.id);
    params.set("cursorStartedAt", String(cursor.startedAtMillis));
  }

  const query = params.toString();

  return request(EvalRunPage, query === "" ? "/evals" : `/evals?${query}`);
};

export const getRun = (id: string) =>
  request(EvalRun, `/evals/${encodeURIComponent(id)}`);

export const listCellHistory = (cellKey: string) =>
  request(
    EvalCellHistory,
    `/evals/cells/${encodeURIComponent(cellKey)}/history`
  );

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

export const createPlayground = (name: string) =>
  post(PlaygroundView, "/evals/playgrounds", { name });

export const getPlayground = (id: string) =>
  request(PlaygroundView, `/evals/playgrounds/${encodeURIComponent(id)}`);

export const savePlayground = (
  id: string,
  input: { readonly config: PlaygroundConfig; readonly name: string }
) =>
  request(PlaygroundView, `/evals/playgrounds/${encodeURIComponent(id)}`, {
    body: JSON.stringify(input),
    method: "PUT",
  });

export const getModelCatalogue = (harness: EvalHarness, query: string) => {
  const params = new URLSearchParams({ harness });

  if (query.trim() !== "") {
    params.set("q", query.trim());
  }

  return request(ModelCatalogue, `/evals/models?${params}`);
};

export const rerunCell = (runId: string, cellKey: string, trials: number) =>
  post(
    StartedEval,
    `/evals/${encodeURIComponent(runId)}/cells/${encodeURIComponent(cellKey)}/runs`,
    { trials }
  );

export const runPlayground = (id: string) =>
  post(StartedEval, `/evals/playgrounds/${encodeURIComponent(id)}/runs`, {});
