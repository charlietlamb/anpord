import { Schema } from "effect";
import { Author, PromptId, Timestamp, VersionNumber } from "./prompts";

/**
 * What happened. Overwriting is the one act on a prompt that destroys
 * something, so it is the first thing recorded here; renames and deletions
 * belong in the same place when they come.
 */
export const PromptEventKind = Schema.Literal("overwrote");
export type PromptEventKind = typeof PromptEventKind.Type;

export const PromptEvent = Schema.Struct({
  actor: Schema.NullOr(Author),
  createdAt: Timestamp,
  id: Schema.String,
  kind: PromptEventKind,
  promptId: PromptId,
  /** Absent for events that concern the prompt rather than one of its
   * versions. */
  version: Schema.NullOr(VersionNumber),
}).annotations({
  description: "Something that happened to a prompt, and who did it.",
  identifier: "PromptEvent",
});
export type PromptEvent = typeof PromptEvent.Type;

export const PromptEventList = Schema.Array(PromptEvent);
export type PromptEventList = typeof PromptEventList.Type;
