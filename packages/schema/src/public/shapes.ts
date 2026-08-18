import { Schema } from "effect";
import {
  ChannelName,
  CommitMessage,
  PromptConfig,
  PromptId,
  PromptName,
  VersionNumber,
} from "../domain/prompts";

const Instant = Schema.DateTimeUtc.annotations({
  description: "An ISO-8601 timestamp in UTC.",
  identifier: "Instant",
});

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
  identifier: "ResolvedPrompt",
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
export type PublicVersion = typeof PublicVersion.Type;

export const PublicPromptWithVersions = Schema.extend(
  PublicPrompt,
  Schema.Struct({
    versions: Schema.optional(Schema.Array(PublicVersion)),
  })
).annotations({
  description:
    "A prompt, with its version history when `includeVersions` is set.",
  identifier: "Prompt",
});
export type PublicPromptWithVersions = typeof PublicPromptWithVersions.Type;

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
