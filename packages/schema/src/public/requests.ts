import { Schema } from "effect";
import {
  ChannelName,
  CommitMessage,
  PromptConfig,
  PromptId,
  PromptName,
  VersionNumber,
} from "../prompts";

export const GetPromptRequest = Schema.Struct({
  channel: Schema.optional(ChannelName),
  id: PromptId,
  includeVersions: Schema.optional(Schema.Boolean),
  version: Schema.optional(VersionNumber),
}).annotations({
  description:
    "Resolve a prompt. Give a version to pin one, a channel to follow one, " +
    "or neither for production.",
  identifier: "GetPromptRequest",
});

export const ListVersionsRequest = Schema.Struct({
  id: PromptId,
}).annotations({
  description: "Show a prompt's version history.",
  identifier: "ListVersionsRequest",
});

export const ListPromptsRequest = Schema.Struct({}).annotations({
  description: "No parameters; returns every prompt in the organization.",
  identifier: "ListPromptsRequest",
});

export const CreatePromptRequest = Schema.Struct({
  config: Schema.optional(PromptConfig),
  content: Schema.String.pipe(Schema.minLength(1)),
  description: Schema.optional(Schema.String),
  id: PromptId,
  message: Schema.optional(CommitMessage),
  name: PromptName,
}).annotations({
  description: "Create a prompt and its first version.",
  identifier: "CreatePromptRequest",
});

export const UpdatePromptRequest = Schema.Struct({
  config: Schema.optional(PromptConfig),
  content: Schema.String.pipe(Schema.minLength(1)),
  id: PromptId,
  message: Schema.optional(CommitMessage),
}).annotations({
  description: "Add a version to a prompt. The new version becomes the latest.",
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
  description: "Archive a prompt. Existing versions stay readable by number.",
  identifier: "ArchivePromptRequest",
});

export const Ok = Schema.Struct({
  ok: Schema.Literal(true),
}).annotations({
  description: "The operation succeeded.",
  identifier: "Ok",
});
