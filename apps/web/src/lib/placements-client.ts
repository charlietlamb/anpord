import {
  type ApplyPlacementsRequest,
  ApplyPlacementsResponse,
  PlacementPage,
} from "@anpord/schema/domain/placements";
import { Effect, Schema } from "effect";

const BASE = "/api/placements";

/** The status is parenthesised so a dead session is recognised and failed
 * rather than retried, and the body's own message is preferred so a caller
 * reads the reason instead of a raw payload. */
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

export const listPlacements = (params: {
  cursor?: string;
  limit?: number;
  q?: string;
}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }

  return request(PlacementPage, query.size > 0 ? `?${query}` : "");
};

export const applyPlacements = (body: ApplyPlacementsRequest) =>
  request(ApplyPlacementsResponse, "", {
    body: JSON.stringify(body),
    method: "POST",
  });
