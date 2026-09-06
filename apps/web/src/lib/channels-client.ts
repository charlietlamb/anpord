import type { Channel } from "@anpord/schema/domain/channels";
import { fromWire } from "@/lib/wire";

const BASE = "/api/channels";

async function send(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  return response;
}

async function request<A>(path: string, init?: RequestInit): Promise<A> {
  const response = await send(path, init);

  return fromWire<A>(await response.json());
}

export const listChannels = () => request<readonly Channel[]>("");

export const createChannel = (body: { color: string; name: string }) =>
  request<Channel>("", { body: JSON.stringify(body), method: "POST" });

export const updateChannel = (
  name: string,
  body: { color?: string; name?: string }
) =>
  request<Channel>(`/${encodeURIComponent(name)}`, {
    body: JSON.stringify(body),
    method: "PATCH",
  });

export const deleteChannel = async (name: string): Promise<void> => {
  await send(`/${encodeURIComponent(name)}`, { method: "DELETE" });
};
