import {
  ChannelPlacement,
  type CreatePromptRequest,
  PromptSummary,
  ResolvedPrompt,
  type SetChannelRequest,
} from "@anpord/schema/domain/prompts";
import { Effect, Schema } from "effect";

const BASE = "/api/prompts";

const ChannelPlacementList = Schema.Array(ChannelPlacement);
const ResolvedPromptList = Schema.Array(ResolvedPrompt);
const PromptSummaryList = Schema.Array(PromptSummary);

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
 * Responses arrive as JSON, so dates are strings and branded fields are plain.
 * Decoding here rather than casting is what keeps `createdAt` an actual Date by
 * the time a component formats it.
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

export const listPrompts = () => request(PromptSummaryList, "");

export const listVersions = (id: string) =>
  request(ResolvedPromptList, `/${encodeURIComponent(id)}/versions`);

export const createPrompt = (body: CreatePromptRequest) =>
  request(ResolvedPrompt, "", {
    body: JSON.stringify(body),
    method: "POST",
  });

export const addVersion = (
  id: string,
  body: { content: string; commitMessage?: string; publish?: boolean }
) =>
  request(ResolvedPrompt, `/${encodeURIComponent(id)}/versions`, {
    body: JSON.stringify(body),
    method: "POST",
  });

export const listChannels = (id: string) =>
  request(ChannelPlacementList, `/${encodeURIComponent(id)}/channels`);

export const setChannel = async (
  id: string,
  body: SetChannelRequest
): Promise<void> => {
  await send(`/${encodeURIComponent(id)}/channels`, {
    body: JSON.stringify(body),
    method: "PUT",
  });
};
