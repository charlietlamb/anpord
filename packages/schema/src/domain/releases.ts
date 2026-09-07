import { Schema } from "effect";
import { VersionNumber } from "./prompts";

export const Release = Schema.Struct({
  _tag: Schema.Literal("Pinned"),
  version: VersionNumber,
}).annotations({
  description: "What a channel points at.",
  identifier: "Release",
});
export type Release = typeof Release.Type;

export const pinned = (version: VersionNumber): Release => ({
  _tag: "Pinned",
  version,
});
