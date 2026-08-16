import type { ChannelName, VersionNumber } from "@anpord/schema/prompts";
import { PRODUCTION } from "@anpord/schema/prompts";

interface Addressed {
  readonly channel?: ChannelName;
  readonly version?: VersionNumber;
}

export const selectorFor = (payload: Addressed) =>
  payload.version ? { version: payload.version } : { channel: payload.channel };

export const answeringChannel = (payload: Addressed) =>
  payload.version ? null : (payload.channel ?? PRODUCTION);
