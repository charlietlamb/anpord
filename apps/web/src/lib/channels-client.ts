import { Channel } from "@anpord/schema/domain/channels";
import { Schema } from "effect";
import { createApiClient } from "@/lib/api-client";

const api = createApiClient("/api/channels");

export const listChannels = () => api.request(Schema.Array(Channel), "");

export const createChannel = (body: { color: string; name: string }) =>
  api.post(Channel, "", body);

export const updateChannel = (
  name: string,
  body: { color?: string; name?: string }
) => api.patch(Channel, `/${encodeURIComponent(name)}`, body);

export const deleteChannel = (name: string) =>
  api.remove(`/${encodeURIComponent(name)}`);
