import {
  ChannelPlacement,
  type CreatePromptRequest,
  PromptPage,
  ResolvedPrompt,
  type SetChannelRequest,
  type UpdatePromptRequest,
} from "@anpord/schema/domain/prompts";
import { Schema } from "effect";
import { createApiClient, searchOf } from "@/lib/api-client";

const api = createApiClient("/api/prompts");

export const listPrompts = (params: {
  cursor?: string;
  limit?: number;
  q?: string;
  sort?: string;
}) => api.request(PromptPage, searchOf(params));

export const listVersions = (id: string) =>
  api.request(
    Schema.Array(ResolvedPrompt),
    `/${encodeURIComponent(id)}/versions`
  );

export const createPrompt = (body: CreatePromptRequest) =>
  api.request(ResolvedPrompt, "", {
    body: JSON.stringify(body),
    method: "POST",
  });

export const addVersion = (
  id: string,
  body: { content: string; commitMessage?: string; publish?: boolean }
) =>
  api.request(ResolvedPrompt, `/${encodeURIComponent(id)}/versions`, {
    body: JSON.stringify(body),
    method: "POST",
  });

export const updateVersion = (
  id: string,
  version: number,
  body: { content: string; commitMessage?: string }
) =>
  api.request(
    ResolvedPrompt,
    `/${encodeURIComponent(id)}/versions/${version}`,
    {
      body: JSON.stringify(body),
      method: "PATCH",
    }
  );

export const updatePrompt = (id: string, body: UpdatePromptRequest) =>
  api.request(ResolvedPrompt, `/${encodeURIComponent(id)}`, {
    body: JSON.stringify(body),
    method: "PATCH",
  });

export const listChannels = (id: string) =>
  api.request(
    Schema.Array(ChannelPlacement),
    `/${encodeURIComponent(id)}/channels`
  );

export const setChannel = async (
  id: string,
  body: SetChannelRequest
): Promise<void> => {
  await api.send(`/${encodeURIComponent(id)}/channels`, {
    body: JSON.stringify(body),
    method: "PUT",
  });
};
