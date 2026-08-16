import { Schema } from "effect";
import { ChannelName, Timestamp } from "./prompts";

/** Stored as token names rather than hex so a channel keeps its meaning when the
 * theme changes. */
export const ChannelColor = Schema.Literal(
  "slate",
  "blue",
  "teal",
  "green",
  "amber",
  "red",
  "purple",
  "pink"
);
export type ChannelColor = typeof ChannelColor.Type;

export const DEFAULT_CHANNEL_COLOR: ChannelColor = "slate";

export const Channel = Schema.Struct({
  color: ChannelColor,
  createdAt: Timestamp,
  name: ChannelName,
  promptCount: Schema.Int,
});
export type Channel = typeof Channel.Type;

export const CreateChannelRequest = Schema.Struct({
  color: ChannelColor,
  name: ChannelName,
});
export type CreateChannelRequest = typeof CreateChannelRequest.Type;

export const UpdateChannelRequest = Schema.Struct({
  color: Schema.optional(ChannelColor),
  name: Schema.optional(ChannelName),
});
export type UpdateChannelRequest = typeof UpdateChannelRequest.Type;
