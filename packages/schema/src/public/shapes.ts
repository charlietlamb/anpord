import { Schema } from "effect";
import {
  ChannelName,
  CommitMessage,
  PromptConfig,
  PromptId,
  PromptName,
  VersionNumber,
} from "../prompts";

/** The internal `Timestamp` also accepts a `Date`, which has no JSON form. */
const Instant = Schema.DateTimeUtc.annotations({
  description: "An ISO-8601 timestamp in UTC.",
  identifier: "Instant",
});

/** Separate from `ResolvedPrompt` so internal fields cannot leak to customers. */
export const PublicPrompt = Schema.Struct({
  channel: Schema.NullOr(ChannelName),
  config: PromptConfig,
  content: Schema.String,
  createdAt: Instant,
  id: PromptId,
  message: Schema.NullOr(CommitMessage),
  name: PromptName,
  version: VersionNumber,
}).annotations({
  description: "A prompt resolved at a specific version.",
  identifier: "Prompt",
});
export type PublicPrompt = typeof PublicPrompt.Type;

export const PublicVersion = Schema.Struct({
  createdAt: Instant,
  message: Schema.NullOr(CommitMessage),
  version: VersionNumber,
}).annotations({
  description: "One entry in a prompt's history.",
  identifier: "Version",
});

/** One schema rather than a union: a union with a superset encodes ambiguously. */
export const PublicPromptWithVersions = Schema.Struct({
  channel: Schema.NullOr(ChannelName),
  config: PromptConfig,
  content: Schema.String,
  createdAt: Instant,
  id: PromptId,
  message: Schema.NullOr(CommitMessage),
  name: PromptName,
  version: VersionNumber,
  versions: Schema.optional(Schema.Array(PublicVersion)),
}).annotations({
  description:
    "A prompt, with its version history when `includeVersions` is set.",
  identifier: "Prompt",
});

export const PublicPromptSummary = Schema.Struct({
  id: PromptId,
  latestVersion: Schema.NullOr(VersionNumber),
  name: PromptName,
  productionVersion: Schema.NullOr(VersionNumber),
  updatedAt: Instant,
}).annotations({
  description: "A prompt without its content.",
  identifier: "PromptSummary",
});
export type PublicPromptSummary = typeof PublicPromptSummary.Type;

export const PromptList = Schema.Struct({
  data: Schema.Array(PublicPromptSummary),
}).annotations({
  description: "Every prompt in the organization.",
  identifier: "PromptList",
});
