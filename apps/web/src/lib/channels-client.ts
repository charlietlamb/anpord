import { Channel } from "@anpord/schema/domain/channels";
import { Effect, Schema } from "effect";

const BASE = "/api/channels";

const ChannelList = Schema.Array(Channel);

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

async function request<A, I>(
  schema: Schema.Schema<A, I>,
  path: string,
  init?: RequestInit
): Promise<A> {
  const response = await send(path, init);
  const payload = await response.json();

  return Effect.runPromise(Schema.decodeUnknown(schema)(payload));
}

export const listChannels = () => request(ChannelList, "");

/** The dialog hands back a plain string, so the brand is applied here at the
 * boundary rather than being asserted by every caller. */
export const createChannel = (body: { color: string; name: string }) =>
  request(Channel, "", { body: JSON.stringify(body), method: "POST" });

export const updateChannel = (
  name: string,
  body: { color?: string; name?: string }
) =>
  request(Channel, `/${encodeURIComponent(name)}`, {
    body: JSON.stringify(body),
    method: "PATCH",
  });

export const deleteChannel = async (name: string): Promise<void> => {
  await send(`/${encodeURIComponent(name)}`, { method: "DELETE" });
};
