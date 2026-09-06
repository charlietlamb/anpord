import { PromptActivityPage } from "@anpord/schema/domain/prompt-activity";
import type { PromptEventKind } from "@anpord/schema/domain/prompt-events";
import { Effect, Schema } from "effect";

const BASE = "/api/activity";

export interface ActivityFilters {
  readonly channel?: string;
  readonly cursor?: string;
  readonly kind?: PromptEventKind;
  readonly limit?: number;
  readonly prompt?: string;
}

async function send(path: string): Promise<Response> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }

  return response;
}

export const listActivity = async (
  filters: ActivityFilters = {}
): Promise<PromptActivityPage> => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }

  const response = await send(query.size > 0 ? `?${query}` : "");
  const payload = await response.json();

  return Effect.runPromise(Schema.decodeUnknown(PromptActivityPage)(payload));
};
