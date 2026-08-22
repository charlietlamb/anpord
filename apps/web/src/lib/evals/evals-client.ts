import type { PlaygroundConfigView } from "@anpord/schema/domain/evals";
import {
  EvalCellHistoryEntry,
  EvalRun,
  EvalRunSummary,
  PlaygroundView,
  StartedEval,
} from "@anpord/schema/domain/evals";
import { Effect, Schema } from "effect";

const BASE = "/api/evals";

const EvalRunSummaryList = Schema.Array(EvalRunSummary);
const EvalCellHistory = Schema.Array(EvalCellHistoryEntry);
const PlaygroundList = Schema.Array(PlaygroundView);

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

/**
 * Responses arrive as JSON, so dates are strings and every number is loose.
 * Decoding rather than casting is what keeps `startedAt` an actual Date and
 * `startedAtMillis` an actual number by the time a waterfall subtracts them.
 */
async function request<A, I>(
  schema: Schema.Schema<A, I>,
  path: string,
  init?: RequestInit
): Promise<A> {
  const response = await send(path, init);
  const payload = await response.json();

  return Effect.runPromise(Schema.decodeUnknown(schema)(payload));
}

export const listRuns = () => request(EvalRunSummaryList, "");

export const getRun = (id: string) =>
  request(EvalRun, `/${encodeURIComponent(id)}`);

/** Past readings of one cell, which is what turns `unchanged` into
 * `unchanged since 14 Aug`. */
export const listCellHistory = (cellKey: string) =>
  request(EvalCellHistory, `/cells/${encodeURIComponent(cellKey)}/history`);

/** Encoded rather than posted raw: the wire wants `{"kind":"files",…}` shapes
 * and DateTime strings, and letting the schema write them is what keeps a
 * request the server will accept from being a request it merely might. */
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
  post(PlaygroundView, "/playgrounds", { name });

export const savePlayground = (
  id: string,
  input: { readonly config: PlaygroundConfig; readonly name: string }
) =>
  request(PlaygroundView, `/playgrounds/${encodeURIComponent(id)}`, {
    body: JSON.stringify(input),
    method: "PUT",
  });

export const runPlayground = (id: string) =>
  post(StartedEval, `/playgrounds/${encodeURIComponent(id)}/runs`, {});

export const listPlaygrounds = () => request(PlaygroundList, "/playgrounds");

export const getPlayground = (id: string) =>
  request(PlaygroundView, `/playgrounds/${encodeURIComponent(id)}`);
