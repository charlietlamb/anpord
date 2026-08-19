import {
  EvalRun,
  EvalRunSummary,
  type StartEvalRequest,
  StartedEval,
} from "@anpord/schema/domain/evals";
import { Effect, Schema } from "effect";

const BASE = "/api/evals";

const EvalRunSummaryList = Schema.Array(EvalRunSummary);

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

/** Decoded rather than cast, because a run carries dates and a discriminated
 * status, and asserting them would let a shape change reach a component as a
 * render error rather than as a decode error here. */
const decode = <A, I>(schema: Schema.Schema<A, I>, body: unknown) =>
  Effect.runPromise(Schema.decodeUnknown(schema)(body as I));

export const listEvalRuns = async () => {
  const response = await send("");

  return decode(EvalRunSummaryList, await response.json());
};

export const getEvalRun = async (id: string) => {
  const response = await send(`/${encodeURIComponent(id)}`);

  return decode(EvalRun, await response.json());
};

export const startEvalRun = async (request: StartEvalRequest) => {
  const response = await send("", {
    body: JSON.stringify(request),
    method: "POST",
  });

  return decode(StartedEval, await response.json());
};
