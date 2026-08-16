import type { ChannelName, VersionNumber } from "@anpord/schema/domain/prompts";

interface Addressed {
  readonly channel?: ChannelName;
  readonly version?: VersionNumber;
}

export const selectorFor = (payload: Addressed) =>
  payload.version ? { version: payload.version } : { channel: payload.channel };
