import { Schema } from "effect";
import { Author, ChannelName, Timestamp, VersionNumber } from "./prompts";

/**
 * What happened to a prompt. A tagged union rather than a kind plus a bag of
 * nullable fields, so a reader gets exactly the columns their kind uses and
 * adding a kind is exhaustively checked wherever entries are read.
 */
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

/**
 * What kind of move this was. Derived from the versions rather than stored, so
 * it cannot disagree with them, and named here rather than left to the reader
 * to work out by comparing two numbers.
 *
 * A repeat is a move to the version already serving. Nothing changed for
 * callers, so it reads as its own kind rather than as a promotion that happens
 * to be a no-op.
 */
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
  /** Absent on a channel's first move, where there is nowhere to move from. */
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
  /** Opaque to callers, and null once the last page has been read. A short page
   * does not mean the end: only this saying so does. */
  nextCursor: Schema.NullOr(Schema.String),
});
export type PromptActivityPage = typeof PromptActivityPage.Type;
