import { Schema } from "effect";
import {
  ChannelName,
  CommitMessage,
  PromptConfig,
  PromptContent,
  PromptId,
  PromptName,
  VersionNumber,
} from "../domain/prompts";

export const GetPromptRequest = Schema.Struct({
  channel: Schema.optional(ChannelName),
  id: PromptId,
  includeVersions: Schema.optional(Schema.Boolean),
  version: Schema.optional(VersionNumber),
}).annotations({
  description:
    "Resolve a prompt. Give a version to pin one, a channel to follow one, " +
    "or neither for the organization's default channel.",
  identifier: "GetPromptRequest",
});

export const ListVersionsRequest = Schema.Struct({
  id: PromptId,
}).annotations({
  description: "Show a prompt's version history.",
  identifier: "ListVersionsRequest",
});

export const ListPromptsRequest = Schema.Record({
  key: Schema.String,
  value: Schema.Never,
}).annotations({
  description: "No parameters; returns up to 100 prompts in the organization.",
  identifier: "ListPromptsRequest",
});

export const CreatePromptRequest = Schema.Struct({
  config: Schema.optional(PromptConfig),
  content: PromptContent,
  description: Schema.optional(Schema.String),
  id: PromptId,
  message: Schema.optional(CommitMessage),
  name: PromptName,
}).annotations({
  description:
    "Create a prompt and publish its first version to the default channel.",
  identifier: "CreatePromptRequest",
});

export const UpdatePromptRequest = Schema.Struct({
  config: Schema.optional(PromptConfig),
  content: PromptContent,
  id: PromptId,
  message: Schema.optional(CommitMessage),
}).annotations({
  description:
    "Add a version to a prompt. The new version becomes latest, and omitted config is stored as an empty object.",
  identifier: "UpdatePromptRequest",
});

export const PromotePromptRequest = Schema.Struct({
  channel: ChannelName,
  id: PromptId,
  version: VersionNumber,
}).annotations({
  description: "Point a channel at a version.",
  identifier: "PromotePromptRequest",
});

export const ArchivePromptRequest = Schema.Struct({
  id: PromptId,
}).annotations({
  description: "Archive a prompt. Existing selectors stay readable.",
  identifier: "ArchivePromptRequest",
});

export const Ok = Schema.Struct({
  ok: Schema.Literal(true),
}).annotations({
  description: "The operation succeeded.",
  identifier: "Ok",
});
