import { Schema } from "effect";
import { Author, ChannelName, Timestamp, VersionNumber } from "./prompts";

const Happened = {
  actor: Schema.NullOr(Author),
  at: Timestamp,
  id: Schema.String,
};

export const PromptSaved = Schema.TaggedStruct("saved", {
  ...Happened,
  message: Schema.NullOr(Schema.String),
  version: Schema.NullOr(VersionNumber),
});

export const PromptOverwritten = Schema.TaggedStruct("overwrote", {
  ...Happened,
  version: Schema.NullOr(VersionNumber),
});

/* Derived from the versions rather than stored, so it cannot disagree with them. A repeat moves to the version already serving. */
export const DeploymentKind = Schema.Literal(
  "first",
  "promotion",
  "repeat",
  "rollback"
);
export type DeploymentKind = typeof DeploymentKind.Type;

export const PromptDeployed = Schema.TaggedStruct("deployed", {
  ...Happened,
  channel: ChannelName,
  /* Absent on a channel's first move, where there is nowhere to move from. */
  from: Schema.NullOr(VersionNumber),
  move: DeploymentKind,
  to: Schema.NullOr(VersionNumber),
});

export const PromptActivityEntry = Schema.Union(
  PromptSaved,
  PromptOverwritten,
  PromptDeployed
).annotations({
  description: "One thing that happened to a prompt, and who did it.",
  identifier: "PromptActivityEntry",
});
export type PromptActivityEntry = typeof PromptActivityEntry.Type;

export const PromptActivityPage = Schema.Struct({
  items: Schema.Array(PromptActivityEntry),
  /* Null once the last page has been read; a short page does not mean the end. */
  nextCursor: Schema.NullOr(Schema.String),
});
export type PromptActivityPage = typeof PromptActivityPage.Type;
