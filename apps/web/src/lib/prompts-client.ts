import type {
  CreatePromptRequest,
  PromptSummary,
  ResolvedPrompt,
} from "@anpord/schema/prompts";

const BASE = "/api/prompts";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

  return response.json() as Promise<T>;
}

export const listPrompts = () => request<PromptSummary[]>("");

export const createPrompt = (body: CreatePromptRequest) =>
  request<ResolvedPrompt>("", { method: "POST", body: JSON.stringify(body) });

export const addVersion = (
  id: string,
  body: { content: string; commitMessage?: string; publish?: boolean }
) =>
  request<ResolvedPrompt>(`/${encodeURIComponent(id)}/versions`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const listVersions = (id: string) =>
  request<ResolvedPrompt[]>(`/${encodeURIComponent(id)}/versions`);
